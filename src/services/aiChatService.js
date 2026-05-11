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
  addVaccineRecord,
  addADRecord,
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
    name: 'get_records_by_date_range',
    description: '获取指定日期范围内的所有辅食记录，按日期分组，便于查看一段时间的辅食情况',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: '开始日期，格式 YYYY-MM-DD，如 2026-05-01',
        },
        end_date: {
          type: 'string',
          description: '结束日期，格式 YYYY-MM-DD，如 2026-05-06',
        },
      },
      required: ['start_date', 'end_date'],
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
    name: 'add_record_via_chat',
    description: '通过对话录入一条宝宝喂养/护理记录，自动保存到本地数据库。可录入：母乳/配方奶/辅食时长（分钟）、辅食内容、大小便情况（类型+形态）、AD服用情况、疫苗名称+剂次+机构+时间。返回操作结果。',
    input_schema: {
      type: 'object',
      properties: {
        feed_type: {
          type: 'string',
          description: '记录类型：母乳、配方奶、辅食、大小便、AD、疫苗',
        },
        duration: {
          type: 'integer',
          description: '喂养时长（分钟），辅食用',
        },
        solid_food: {
          type: 'string',
          description: '辅食内容，如"米粉+苹果泥"',
        },
        formula_amount: {
          type: 'string',
          description: '配方奶奶量（毫升）',
        },
        diaper_type: {
          type: 'string',
          description: '大小便类型：小便、大便、两者都有',
        },
        stool_consistency: {
          type: 'string',
          description: '大便形态：正常、偏硬、偏软、稀水',
        },
        ad_taken: {
          type: 'boolean',
          description: 'AD是否已服用',
        },
        ad_dosage: {
          type: 'string',
          description: 'AD剂量：一粒、两粒',
        },
        vaccine_name: {
          type: 'string',
          description: '疫苗名称，如"五联疫苗"',
        },
        vaccine_dose: {
          type: 'string',
          description: '剂次，如"第1针"',
        },
        hospital: {
          type: 'string',
          description: '接种机构',
        },
        recorded_at: {
          type: 'string',
          description: '记录时间，格式 YYYY-MM-DD HH:MM:SS，默认为当前时间',
        },
        notes: {
          type: 'string',
          description: '备注说明',
        },
      },
      required: ['feed_type'],
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

    case 'get_records_by_date_range': {
      const { start_date, end_date } = toolArgs;
      const all = await getAllRecords();
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999); // inclusive
      const filtered = all.filter(r => {
        const d = new Date((r.recorded_at || r.created_at).replace(/\//g, '-'));
        return d >= start && d <= end;
      });
      if (filtered.length === 0) {
        return `【${start_date} ~ ${end_date}】暂无辅食记录`;
      }
      // 辅食只展示 feed_type='辅食' 的，按日期分组
      const solidFoods = filtered.filter(r => r.record_type === 'feeding' && r.feed_type === '辅食');
      if (solidFoods.length === 0) {
        return `【${start_date} ~ ${end_date}】暂无辅食记录`;
      }
      const lines = [`【${start_date} ~ ${end_date}】辅食记录（共${solidFoods.length}条）：`];
      const byDate = {};
      solidFoods.forEach(r => {
        const d = (r.recorded_at || r.created_at).slice(0, 10);
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(r.solid_food || '未知');
      });
      Object.keys(byDate).sort().forEach(date => {
        lines.push(`${date}：${byDate[date].join('、')}`);
      });
      return lines.join('\n');
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

    case 'add_record_via_chat': {
      const {
        feed_type,
        duration,
        solid_food,
        formula_amount,
        diaper_type,
        stool_consistency,
        ad_taken,
        ad_dosage,
        vaccine_name,
        vaccine_dose,
        hospital,
        recorded_at,
        notes,
      } = toolArgs;

      try {
        if (feed_type === '疫苗') {
          await addVaccineRecord({
            vaccineName: vaccine_name || '未命名疫苗',
            vaccineDose: vaccine_dose || '',
            hospital: hospital || '',
            notes: notes || '',
            vaccinatedAt: recorded_at || undefined,
          });
          return `✅ 疫苗记录已保存：${vaccine_name || '未命名疫苗'} ${vaccine_dose || ''}。`;
        }

        if (feed_type === 'AD') {
          await addADRecord({
            isTaken: ad_taken !== false,
            dosage: ad_dosage || '一粒',
            recordedAt: recorded_at || undefined,
            notes: notes || '',
          });
          return `✅ AD记录已保存：${ad_taken !== false ? '已服用' : '未服用'} ${ad_dosage || '一粒'}。`;
        }

        if (feed_type === '大小便') {
          await addRecord({
            feedType: diaper_type || '两者都有',
            duration: 0,
            notes: notes || '',
            solidFood: stool_consistency || '',
            diaperType: diaper_type || '两者都有',
            stoolConsistency: stool_consistency || '',
            recordedAt: recorded_at || undefined,
          });
          return `✅ 大小便记录已保存：${diaper_type || '两者都有'} ${stool_consistency ? `，形态：${stool_consistency}` : ''}。`;
        }

        // 母乳 / 配方奶 / 辅食
        await addRecord({
          feedType: feed_type,
          duration: duration || 0,
          notes: notes || '',
          solidFood: feed_type === '辅食' ? (solid_food || '') : (formula_amount || ''),
          recordedAt: recorded_at || undefined,
        });

        let detail = '';
        if (feed_type === '辅食' && solid_food) detail = `，内容：${solid_food}`;
        if (feed_type === '配方奶' && formula_amount) detail = `，${formula_amount}毫升`;

        return `✅ ${feed_type}记录已保存${detail ? `（${detail}）` : ''}，时长${duration || 0}分钟。`;
      } catch (err) {
        return `❌ 保存失败：${err.message}。请重试。`;
      }
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
- 问"5月1日到5月6日吃了什么辅食"等跨日期范围 → get_records_by_date_range
- 问宝宝基本信息 → get_baby_profile

【通过对话录入数据】
当用户说"记一下"、"帮我记录"、"录入"等意图时，必须调用 add_record_via_chat 工具将数据存入本地数据库：
- 用户说"喂了母乳20分钟" → add_record_via_chat(feed_type="母乳", duration=20)
- 用户说"吃了米粉" → add_record_via_chat(feed_type="辅食", solid_food="米粉")
- 用户说"喝配方奶120毫升" → add_record_via_chat(feed_type="配方奶", formula_amount="120")
- 用户说"今天 AD 吃了一粒" → add_record_via_chat(feed_type="AD", ad_taken=true, ad_dosage="一粒")
- 用户说"打了五联疫苗第1针" → add_record_via_chat(feed_type="疫苗", vaccine_name="五联疫苗", vaccine_dose="第1针")
- 用户说"今天没大便" → add_record_via_chat(feed_type="大小便", diaper_type="两者都有", stool_consistency="正常")
- 用户可指定时间，如"昨晚8点喂了母乳" → add_record_via_chat(feed_type="母乳", duration=20, recorded_at="2026-05-10 20:00:00")

【回复规范】
1. 先调用工具获取数据，再根据数据回答（不要编造数据）
2. 专业但易懂，语气温暖亲切
3. 涉及疾病/异常症状，建议就医
4. 回答控制在 200 字以内
5. 涉及具体日期的问题，必须调用工具
6. 用表格或分点呈现多条记录更清晰

请用中文回复。`;
}
