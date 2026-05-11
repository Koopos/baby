/**
 * AI 聊天服务 - 接入 MiniMax 文字对话 + Function Calling
 * AI 可调用工具查宝宝数据库，实现个性化问答
 */

import {
  getBabyProfile,
  getRecordsByDate,
  getRecordsByMonth,
  getAllRecords,
  addRecord,
} from '../db/recordsRepository';

let apiKey = '';

export function setApiKey(key) {
  apiKey = key;
}

// ─── 工具定义 ─────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_baby_profile',
    description: '获取宝宝基本信息（姓名、性别、生日、体重、身高、发育情况）',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_today_records',
    description: '获取今天所有的喂养和 diaper 记录',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_records_by_date',
    description: '获取指定日期的所有记录',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: '日期，格式 YYYY-MM-DD，如 2026-05-04',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_records_by_month',
    description: '获取指定月份的所有记录，用于分析一段时间的喂养/发育趋势',
    input_schema: {
      type: 'object',
      properties: {
        year: {
          type: 'integer',
          description: '年份，如 2026',
        },
        month: {
          type: 'integer',
          description: '月份 1-12',
        },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_recent_records',
    description: '获取最近 N 天的所有记录',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'integer',
          description: '天数，如 7',
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'add_solid_food_record',
    description: '录入一条辅食记录。当用户说"记一下今天吃了米粉"、"记一下0501吃了苹果泥"等类似语句时调用此工具。',
    input_schema: {
      type: 'object',
      properties: {
        solid_food: {
          type: 'string',
          description: '辅食名称/描述，如"米粉"、"苹果泥"、"南瓜糊"',
        },
        notes: {
          type: 'string',
          description: '备注（可选），如"吃得很好"、"不怎么爱吃"',
        },
        recorded_at: {
          type: 'string',
          description: '记录时间（可选），格式 YYYY-MM-DD HH:MM:SS，如 2026-05-01 10:30:00。不填则使用当前时间。',
        },
      },
      required: ['solid_food'],
    },
  },
];

// ─── 工具执行 ─────────────────────────────────────────────────────

async function executeTool(toolName, toolArgs) {
  switch (toolName) {
    case 'get_baby_profile': {
      const profile = await getBabyProfile();
      if (!profile) return '暂无宝宝信息';
      const age = calcAge(profile.birthday);
      return JSON.stringify({
        name: profile.name,
        gender: profile.gender,
        birthday: profile.birthday,
        age_months: age,
        weight: profile.weight,
        height: profile.height,
        development: profile.development,
        next_checkup: profile.next_checkup,
      }, null, 2);
    }

    case 'get_today_records': {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const records = await getRecordsByDate(dateKey);
      return formatRecords(records);
    }

    case 'get_records_by_date': {
      const { date } = toolArgs;
      const records = await getRecordsByDate(date);
      return formatRecords(records, date);
    }

    case 'get_records_by_month': {
      const { year, month } = toolArgs;
      const records = await getRecordsByMonth(year, month);
      return formatRecords(records, `${year}-${String(month).padStart(2, '0')}`);
    }

    case 'get_recent_records': {
      const { days } = toolArgs;
      const records = await getAllRecords();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const filtered = records.filter(r => {
        const d = new Date((r.recorded_at || r.created_at).replace(/\//g, '-'));
        return d >= cutoff;
      });
      return formatRecords(filtered, `最近${days}天`);
    }

    case 'add_solid_food_record': {
      const { solid_food, notes, recorded_at } = toolArgs;
      await addRecord({
        feedType: '辅食',
        duration: 0,
        notes: notes || '',
        solidFood: solid_food,
        recordedAt: recorded_at,
      });
      const timeStr = recorded_at
        ? new Date(recorded_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3T00:00:00')).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      return `✅ 已录入【辅食】：${solid_food}${notes ? `（${notes}）` : ''}，时间：${timeStr}`;
    }

    default:
      return `未知工具: ${toolName}`;
  }
}

// ─── 辅助函数 ─────────────────────────────────────────────────────

function calcAge(birthday) {
  if (!birthday) return null;
  const birth = new Date(birthday + 'T12:00:00');
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function formatRecords(records, label = '') {
  if (!records || records.length === 0) {
    return label ? `【${label}】暂无记录` : '暂无记录';
  }

  const lines = [];
  if (label) lines.push(`【${label}】共 ${records.length} 条记录：\n`);

  // 按时间分组
  records.forEach((r, i) => {
    const time = (r.recorded_at || r.created_at).replace('T', ' ').slice(0, 16);
    if (r.record_type === 'feeding') {
      if (r.feed_type === '辅食') {
        lines.push(`${i + 1}. [辅食] ${r.solid_food || '未知'} — ${time}`);
      } else {
        lines.push(`${i + 1}. [${r.feed_type}] ${r.duration}分钟 ${r.notes || ''} — ${time}`);
      }
    } else if (r.record_type === 'vaccine') {
      lines.push(`${i + 1}. [疫苗] ${r.feed_type} ${r.vaccine_dose || ''} ${r.hospital || ''} — ${time}`);
    } else {
      lines.push(`${i + 1}. [${r.feed_type || '记录'}] ${r.notes || ''} — ${time}`);
    }
  });

  return lines.join('\n');
}

// ─── 核心聊天函数 ─────────────────────────────────────────────────

export async function sendChatMessage(messages, babyInfo = {}) {
  if (!apiKey) {
    throw new Error('请先配置 API Key');
  }

  const systemPrompt = buildSystemPrompt(babyInfo);

  const response = await callAI(systemPrompt, messages);

  // MiniMax Anthropic 端点返回 Anthropic 原生格式：response.content 数组
  const content = response.content;
  if (!content || !Array.isArray(content)) {
    console.log('[AIChat] 响应无 content:', JSON.stringify(response).slice(0, 500));
    throw new Error(`AI 响应格式异常：content 为空。响应：${JSON.stringify(response).slice(0, 200)}`);
  }

  // 找到文本内容和工具调用
  let textContent = '';
  const toolCalls = [];
  for (const block of content) {
    if (block.type === 'text') {
      textContent += block.text || '';
    } else if (block.type === 'tool_use') {
      toolCalls.push(block);
    }
  }

  // 没有工具调用，直接返回文本
  if (toolCalls.length === 0) {
    return textContent || '抱歉，暂时没有收到回复。';
  }

  // 执行工具调用
  const toolResults = [];
  for (const toolCall of toolCalls) {
    const { id, name: toolName, input: toolArgs } = toolCall;
    const result = await executeTool(toolName, toolArgs || {});
    toolResults.push({
      type: 'tool_result',
      tool_use_id: id,
      content: result,
    });
  }

  // 第二轮对话：AI 结合工具结果回复用户
  const secondResponse = await callAIWithTools(systemPrompt, messages, content, toolResults);

  // 解析最终响应
  const finalContent = secondResponse.content;
  if (!finalContent || !Array.isArray(finalContent)) {
    return '抱歉，处理失败。';
  }
  for (const block of finalContent) {
    if (block.type === 'text') return block.text || '抱歉，暂时没有收到回复。';
  }
  return '抱歉，暂时没有收到回复。';
}

async function callAIWithTools(systemPrompt, messages, assistantContent, toolResults) {
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
    { role: 'assistant', content: assistantContent },
    { role: 'user', content: toolResults },
  ];

  const body = {
    model: 'MiniMax-M2.7',
    messages: conversation,
    max_tokens: 600,
    temperature: 0.7,
    tools: TOOLS,
  };

  console.log('[AIChat] 第二轮请求体:', JSON.stringify(body).slice(0, 500));

  const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`网络请求失败：${response.status} - ${err}`);
  }

  return await response.json();
}

async function callAI(systemPrompt, messages) {
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const body = {
    model: 'MiniMax-M2.7',
    messages: conversation,
    max_tokens: 600,
    temperature: 0.7,
    tools: TOOLS,
  };

  console.log('[AIChat] 请求体:', JSON.stringify(body).slice(0, 500));

  const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`网络请求失败：${response.status} - ${err}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    const raw = await response.text();
    throw new Error(`响应解析失败：${raw.slice(0, 200)}`);
  }

  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`API 错误：${data.base_resp.status_code} - ${data.base_resp.status_msg || ''}`);
  }

  console.log('[AIChat] 响应:', JSON.stringify(data).slice(0, 800));

  return data;
}

function buildSystemPrompt(babyInfo = {}) {
  const { name = '宝宝', ageMonths = null, gender = '男', weight = '', height = '' } = babyInfo;
  const genderStr = gender === '男' ? '男宝' : '女宝';
  const ageStr = ageMonths !== null ? `${ageMonths}个月` : '未知';

  return `你是「宝贝成长助手」，一位专业、温暖的育儿顾问。

【宝宝信息】
- 姓名：${name}
- 性别：${genderStr}
- 月龄：${ageStr}
- 体重：${weight ? `${weight}kg` : '未知'}
- 身高：${height ? `${height}cm` : '未知'}

【你拥有的工具】
当用户问及以下问题时，必须调用对应工具获取真实数据：
- 问"今天/昨天/某天"喝奶、辅食、diaper 情况 → get_today_records 或 get_records_by_date
- 问"最近几天"喂养情况 → get_recent_records
- 问"这月/某月"的情况 → get_records_by_month
- 问宝宝基本信息 → get_baby_profile
- 用户说"记一下吃了 X"、"录入辅食"等 → add_solid_food_record

【日期格式约定】
- add_solid_food_record 的 recorded_at 格式为 YYYY-MM-DD HH:MM:SS，例如 2026-05-01 10:30:00
- 如果用户说"0501"等简略格式，默认当前年份（2026年），转换为 2026-05-01
- 如果用户说"0501-0506每天吃了米粉"，需要为每天（0501、0502、0503、0504、0505、0506）各调用一次 add_solid_food_record

【回复规范】
1. 先调用工具获取数据，再根据数据回答（不要编造数据）
2. 专业但易懂，语气温暖亲切
3. 涉及疾病/异常症状，建议就医
4. 回答控制在 200 字以内
5. 涉及具体日期的问题，必须调用工具
6. 用表格或分点呈现多条记录更清晰

请用中文回复。`;
}
