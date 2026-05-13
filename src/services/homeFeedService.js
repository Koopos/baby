/**
 * 首页信息流 AI 服务
 * 基于宝宝数据和月龄，让 AI 生成适合展示的信息流内容
 * 支持缓存：key 无变化时跳过 AI 请求，直接返回缓存内容
 */

import { getBabyProfile, getRecordsByDate, getAllRecords } from '../db/recordsRepository';
import { getAllReminders } from '../db/reminderRepository';

const FEED_CACHE_KEY = 'home_feed_cache_v1';
const FEED_KEY_FIELD = 'home_feed_cache_key_v1';

// ─── Cache helpers ─────────────────────────────────────────────────────

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 生成用户信息 cache key：birthday + 最新体重 + 最新身高
// 只要这三个字段没变，AI 生成内容就相同（同一月龄同一人）
async function generateCacheKey() {
  const profile = await getBabyProfile();
  const birthday = profile?.birthday || '';
  const weight = profile?.weight || '';
  const height = profile?.height || '';
  return `${getTodayKey()}__${birthday}__${weight}__${height}`;
}

async function readCache() {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const rawKey = await AsyncStorage.getItem(FEED_KEY_FIELD);
    const rawData = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (!rawKey || !rawData) return null;
    const currentKey = await generateCacheKey();
    if (rawKey !== currentKey) return null; // key 变了，需要重新请求
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

async function writeCache(cards) {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const key = await generateCacheKey();
    await AsyncStorage.setItem(FEED_KEY_FIELD, key);
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cards));
  } catch {
    // 缓存失败静默忽略
  }
}

// ─── 工具定义（复刻 AIChatService 的工具集，供 AI 调用）───────────────

const TOOLS = [
  {
    name: 'get_baby_profile',
    description: '获取宝宝基本信息（姓名、性别、生日、体重、身高、发育情况）',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_today_records',
    description: '获取今天所有的喂养和 diaper 记录',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_recent_records',
    description: '获取最近 N 天的所有记录',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'integer', description: '天数，如 7' },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_all_reminders',
    description: '获取所有提醒设置',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

// ─── 工具执行 ───────────────────────────────────────────────────────

async function executeTool(toolName, toolArgs) {
  switch (toolName) {
    case 'get_baby_profile': {
      const profile = await getBabyProfile();
      if (!profile) return '暂无宝宝信息';
      return JSON.stringify(profile, null, 2);
    }
    case 'get_today_records': {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const records = await getRecordsByDate(dateKey);
      return JSON.stringify(records, null, 2);
    }
    case 'get_recent_records': {
      const { days } = toolArgs;
      const all = await getAllRecords();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const filtered = all.filter(r => {
        const d = new Date((r.recorded_at || r.created_at).replace(/\//g, '-'));
        return d >= cutoff;
      });
      return JSON.stringify(filtered, null, 2);
    }
    case 'get_all_reminders': {
      const reminders = await getAllReminders();
      return JSON.stringify(reminders, null, 2);
    }
    default:
      return `未知工具: ${toolName}`;
  }
}

function calcAge(birthday) {
  if (!birthday || typeof birthday !== 'string') return null;
  const dateStr = birthday.trim().split(' ')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const birth = new Date(dateStr + 'T12:00:00');
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  return months;
}

// ─── 核心：生成信息流内容 ────────────────────────────────────────────

async function callAI(systemPrompt, messages, tools) {
  // 从 AsyncStorage 动态读取 API Key（运行时读取，绕过打包时静态读取）
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const apiKey = await AsyncStorage.getItem('ai_chat_api_key');
  if (!apiKey) {
    throw new Error('AI API Key 未配置，请到「AI 对话」页面设置');
  }

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'MiniMax-M2.7',
      messages: conversation,
      max_tokens: 800,
      temperature: 0.7,
      tools,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI 请求失败：${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.content;
  if (!content || !Array.isArray(content)) {
    throw new Error('AI 响应格式异常');
  }

  // 收集工具调用
  const toolCalls = [];
  let textContent = '';
  for (const block of content) {
    if (block.type === 'text') {
      textContent += block.text || '';
    } else if (block.type === 'tool_use') {
      toolCalls.push(block);
    }
  }

  // 执行工具
  if (toolCalls.length > 0) {
    const toolResults = [];
    for (const toolCall of toolCalls) {
      const result = await executeTool(toolCall.name, toolCall.input || {});
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: result,
      });
    }

    // 第二轮：AI 结合工具结果生成最终回复
    const secondResponse = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'assistant', content },
          { role: 'user', content: toolResults },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const secondData = await secondResponse.json();
    const secondContent = secondData.content;
    if (secondContent && Array.isArray(secondContent)) {
      for (const block of secondContent) {
        if (block.type === 'text') return block.text || '';
      }
    }
    return textContent;
  }

  return textContent;
}

function buildSystemPrompt(babyInfo = {}) {
  const { name = '宝宝', ageMonths = null, gender = '男', weight = '', height = '' } = babyInfo;
  const genderStr = gender === '男' ? '男宝' : '女宝';
  const ageStr = ageMonths !== null ? `${ageMonths}个月` : '未知';

  return `你是「宝贝成长助手」首页信息流 AI。你的任务是根据宝宝的真实数据，生成适合在首页信息流展示的内容卡片。

【宝宝信息】
- 姓名：${name}
- 性别：${genderStr}
- 月龄：${ageStr}
- 体重：${weight ? `${weight}kg` : '未知'}
- 身高：${height ? `${height}cm` : '未知'}

【输出格式要求】
你必须严格返回 JSON 数组，不要包含任何其他文字。数组中每条记录代表一个信息流卡片，格式如下：
{
  "type": "卡片类型",
  "title": "标题（15字以内）",
  "summary": "摘要（40字以内）",
  "detail": "详情内容（100字以内，用于展开页面）",
  "tag": "标签（5字以内，如：疫苗提醒、发育指导等）",
  "icon": "emoji 图标",
  "action": "操作类型（view_detail/view_ai/record/none）",
  "actionParam": "操作参数（如跳转页面、记录类型等）"
}

【卡片类型定义】
1. milestone — 发育里程碑：根据月龄给出发育提醒
2. daily_summary — 今日概览：从今日记录提取的数据摘要
3. vaccine_alert — 疫苗提醒：从疫苗记录检测是否逾期或即将到期
4. feeding_tip — 喂养建议：根据近期喂养记录给出建议
5. health_reminder — 健康提醒：体检、AD服用等
6. ai_suggestion — AI 推荐：根据宝宝情况推荐爸妈可能想了解的内容

【生成规则】
1. 每次返回 10-20 张卡片（尽量多生成不同类型的卡片）
2. 优先返回有数据支撑的卡片（今日记录有内容则生成 daily_summary）
3. milestone 根据月龄生成对应阶段（0-1月趴卧、2-3月抬头、4-6月翻身、6-8月坐爬等）
4. vaccine_alert 仅在有疫苗记录且逾期时才出现
5. 所有内容必须基于工具获取的真实数据，不得编造
6. JSON 必须是合法的、可直接 JSON.parse 的字符串

请直接返回 JSON 数组，不要有前缀说明文字。`;
}

export async function fetchHomeFeedCards() {
  try {
    // 先尝试读缓存
    const cached = await readCache();
    if (cached) {
      console.log('[HomeFeed] 命中缓存，跳过 AI 请求');
      return cached;
    }

    // 缓存未命中，请求 AI
    // 先获取宝宝基础信息，算出月龄
    const profile = await getBabyProfile();
    if (!profile) {
      return generateFallbackCards('未知', null, '男', null, null);
    }

    const ageMonths = calcAge(profile.birthday);

    // 构建 prompt
    const systemPrompt = buildSystemPrompt({
      name: profile.name || '宝宝',
      ageMonths,
      gender: profile.gender || '男',
      weight: profile.weight || '',
      height: profile.height || '',
    });

    const userMessage = {
      role: 'user',
      content: `请根据以下宝宝的信息，生成首页信息流卡片：\n宝宝姓名：${profile.name || '宝宝'}\n月龄：${ageMonths}个月\n性别：${profile.gender}\n体重：${profile.weight || '未知'}\n身高：${profile.height || '未知'}\n\n今日是 ${new Date().toLocaleDateString('zh-CN')}。请生成 4-6 张信息流卡片，优先从真实数据中提取内容。`,
    };

    const result = await callAI(systemPrompt, [userMessage], TOOLS);
    console.log('[HomeFeed] AI 返回原始内容:', result);

    // 尝试解析 JSON
    let cards = [];
    try {
      // 去掉可能的前缀（如 "```json" 或 "以下是..." 等）
      const cleaned = result.replace(/^[\s\S]*?(\[[\s\S]*?\])/, '$1').trim();
      cards = JSON.parse(cleaned);
    } catch (e) {
      console.warn('[HomeFeed] JSON 解析失败，使用兜底数据:', e.message);
      cards = generateFallbackCards(profile.name, ageMonths, profile.gender, profile.weight, profile.height);
    }

    // 写入缓存
    await writeCache(cards);

    return cards;
  } catch (err) {
    console.error('[HomeFeed] 获取信息流失败:', err);
    // 出错时返回兜底数据，并缓存兜底内容避免每次都重试
    try {
      const profile = await getBabyProfile();
      const fallback = generateFallbackCards(
        profile?.name || '宝宝',
        calcAge(profile?.birthday),
        profile?.gender || '男',
        profile?.weight || '',
        profile?.height || ''
      );
      await writeCache(fallback);
      return fallback;
    } catch {
      return [];
    }
  }
}

function generateFallbackCards(name, ageMonths, gender, weight, height) {
  const genderStr = gender === '男' ? '男宝' : '女宝';
  const ageStr = ageMonths !== null ? `${ageMonths}个月` : '未知';

  // 根据月龄生成发育里程碑
  const milestones = {
    '0-1': { title: '0-1月：趴趴时间', summary: '醒着时多让宝宝趴卧，锻炼抬头能力', icon: '🦵', detail: '每天 2-3 次趴卧练习，每次 1-2 分钟。趴卧可以锻炼宝宝颈部和背部的肌肉，为后续翻身、坐起打下基础。' },
    '2-3': { title: '2-3月：练习抬头', summary: '竖抱时宝宝能抬头片刻，继续多趴', icon: '👶', detail: '这个阶段宝宝趴着时能抬头 45 度，竖抱时头部逐渐稳定。多进行趴卧练习，有助于颈背肌力增长。' },
    '4-6': { title: '4-6月：翻身与靠坐', summary: '宝宝开始侧翻，可以练习靠坐', icon: '🍼', detail: '4月龄后宝宝会侧身、翻身。可以在床上铺软垫，让宝宝练习从仰卧翻到俯卧。靠坐练习从 5 月开始。' },
    '6-8': { title: '6-8月：独坐与爬行', summary: '宝宝能独坐片刻，开始尝试爬行', icon: '🧸', detail: '6-7月宝宝能独坐，8月左右开始腹爬或手膝爬。多鼓励宝宝在安全地面上探索。' },
    '9-12': { title: '9-12月：站立与迈步', summary: '宝宝扶站或独站，开始学走路', icon: '🚶', detail: '9月龄后宝宝扶东西站立，10-12月学迈步。每天保证安全环境下活动时间，促进大运动发展。' },
    'default': { title: '健康成长中', summary: `${name}目前${ageStr}，各项发育良好`, icon: '🌟', detail: '定期记录身高体重，关注发育曲线，如有异常及时咨询儿科医生。' },
  };

  const mKey = ageMonths !== null
    ? Object.keys(milestones).find(k => k !== 'default' && ageMonths >= parseInt(k) && ageMonths <= parseInt(k.split('-')[1]))
    : 'default';
  const milestone = milestones[mKey] || milestones['default'];

  return [
    // 发育里程碑
    {
      type: 'milestone',
      title: milestone.title,
      summary: milestone.summary,
      detail: milestone.detail,
      tag: '发育里程碑',
      icon: milestone.icon,
      action: 'view_detail',
      actionParam: 'milestone',
    },
    // 喂养建议
    {
      type: 'feeding_tip',
      title: '科学喂养要点',
      summary: `${name}处于${ageStr}期，喂养方式有讲究`,
      detail: `${ageStr} ${genderStr}喂养指南：\n\n• 奶类：母乳或配方奶为主，${ageMonths >= 6 ? '6月龄后可添加辅食' : '按需喂养'}\n• 辅食：${ageMonths >= 6 ? '高铁米粉 → 菜泥 → 果泥 → 肉泥' : '尚未到添加月龄'}\n• 奶量参考：${ageMonths < 6 ? '每天 6-8 次' : '每天 4-6 次'}${ageMonths >= 6 ? '，辅食 1-2 次' : ''}\n• 喂奶姿势：${ageMonths < 3 ? '摇篮式抱姿，抬高头部' : '根据月龄调整抱姿'}\n• 拍嗝：每次喂奶后竖抱拍嗝 5-10 分钟`,
      tag: '喂养指导',
      icon: '🍼',
      action: 'view_detail',
      actionParam: 'feeding_tip',
    },
    {
      type: 'feeding_tip',
      title: '辅食添加指南',
      summary: '6月龄开始引入辅食，遵循从少到多原则',
      detail: '【辅食添加顺序】\n\n1. 第一口：高铁米粉（5-7天）\n2. 蔬菜泥：胡萝卜、南瓜、菠菜\n3. 水果泥：苹果、香蕉、牛油果\n4. 肉泥：猪肉 → 鸡肉 → 鱼肉\n\n【原则】\n• 每次只加一样新食物\n• 观察 2-3 天有无过敏\n• 由稀到稠、由细到粗\n• 1岁前不加盐糖',
      tag: '喂养指导',
      icon: '🥣',
      action: 'view_detail',
      actionParam: 'feeding_tip',
    },
    {
      type: 'feeding_tip',
      title: '每日奶量参考',
      summary: `${ageStr}宝宝每日所需奶量指南`,
      detail: `【${ageStr}每日奶量参考】\n\n• 0-3月：按需喂养，约 500-800ml/天\n• 4-6月：约 800-1000ml/天\n• 6-12月：约 600-800ml/天，辅食 1-2次\n• 1-2岁：约 400-500ml/天，三餐为主\n\n注意：每个宝宝情况不同，供参考`,
      tag: '喂养参考',
      icon: '🥛',
      action: 'view_detail',
      actionParam: 'feeding_tip',
    },
    // 健康提醒
    {
      type: 'health_reminder',
      title: '体检提醒',
      summary: '定期体检是监测发育的重要手段',
      detail: '【体检时间表】\n\n• 出生 42天：首次保健随访\n• 3、6、9、12月：定期随访\n• 1-2岁：每半年一次\n• 3岁以上：每年一次\n\n【体检内容】\n• 身高、体重、头围\n• 发育评估（运动、语言、社会适应）\n• 血红蛋白检测（6月、12月）\n• 视力、听力筛查',
      tag: '健康提醒',
      icon: '🏥',
      action: 'view_detail',
      actionParam: 'health_reminder',
    },
    {
      type: 'health_reminder',
      title: 'AD 补充指南',
      summary: '维生素 AD 是宝宝发育的重要营养素',
      detail: '【AD 补充指南】\n\n• 维生素A：预防夜盲症、促进免疫\n• 维生素D：促进钙吸收、预防佝偻病\n\n【补充剂量】\n• 足月儿：出生后2周开始补维生素D 400IU/天\n• 早产儿：800IU/天，3月后改400IU\n• 1岁后：根据喂养情况调整\n\n【食物来源】\n• 维生素A：胡萝卜、南瓜、动物肝脏\n• 维生素D：晒太阳（每天 1-2 小时）',
      tag: '健康提醒',
      icon: '💊',
      action: 'view_detail',
      actionParam: 'health_reminder',
    },
    {
      type: 'health_reminder',
      title: '常见疾病护理',
      summary: '发烧、腹泻、湿疹的居家护理方法',
      detail: '【发烧护理】\n• 38.5°C以下：物理降温（温水擦浴）\n• 38.5°C以上：退烧药（需医嘱）\n• 及时补充水分\n• 持续高热超3天需就医\n\n【腹泻护理】\n• 口服补液盐防脱水\n• 继续母乳喂养\n• 记录大便次数和性状\n\n【湿疹护理】\n• 保持皮肤湿润\n• 穿透气棉质衣物\n• 严重时就医',
      tag: '健康护理',
      icon: '🌡️',
      action: 'view_detail',
      actionParam: 'health_reminder',
    },
    // AI 推荐
    {
      type: 'ai_suggestion',
      title: '本月龄养育建议',
      summary: `根据${name}的月龄（${ageStr}）推荐`,
      detail: `【${ageStr} ${genderStr}养育要点】\n\n1. 喂养：奶类为主，${ageMonths >= 6 ? '6月龄后可逐步添加辅食，从高铁米粉开始' : '母乳或配方奶满足营养需求'}\n2. 睡眠：${ageMonths <= 3 ? '每天14-17小时' : ageMonths <= 8 ? '每天12-15小时' : '每天11-14小时'}，培养规律作息\n3. 互动：多与宝宝说话、唱歌，促进语言发育\n4. 大运动：根据月龄练习抬头、翻身、坐、爬等\n5. 体检：按期完成儿科保健体检，关注发育曲线`,
      tag: 'AI 推荐',
      icon: '🤖',
      action: 'view_detail',
      actionParam: 'ai_suggestion',
    },
    {
      type: 'ai_suggestion',
      title: '早教游戏推荐',
      summary: `适合${ageStr}宝宝的亲子互动游戏`,
      detail: `【${ageStr}早教游戏】\n\n${ageMonths < 3 ? `• 追视游戏：黑白卡在眼前缓慢移动\n• 趴卧练习：每天2-3次，每次1-2分钟\n• 抓握练习：让宝宝抓握摇铃\n• 抚触按摩：促进神经发育` : ''}\n\n${ageMonths >= 3 && ageMonths < 6 ? `• 翻身练习：侧卧引导翻身\n• 靠坐训练：从靠着垫子到独坐\n• 抓握游戏：换手传递玩具\n• 照镜子：认识自己的脸` : ''}\n\n${ageMonths >= 6 && ageMonths < 12 ? `• 爬行练习：鼓励腹爬和手膝爬\n• 扶站游戏：扶家具站立\n• 精细动作：捏小物品、翻书\n• 语言引导：教叫爸爸妈妈` : ''}\n\n${ageMonths >= 12 ? `• 独站独走：鼓励自主行走\n• 简单指令：听从并执行\n• 认识物品：指着叫名称\n• 社交游戏：和其他宝宝互动` : ''}`,
      tag: '早教游戏',
      icon: '🎮',
      action: 'view_detail',
      actionParam: 'ai_suggestion',
    },
    {
      type: 'ai_suggestion',
      title: '睡眠培养指南',
      summary: '良好的睡眠习惯影响宝宝一生',
      detail: `【${ageStr}睡眠指南】\n\n• 睡眠时长：${ageMonths <= 3 ? '14-17小时/天' : ageMonths <= 8 ? '12-15小时/天' : '11-14小时/天'}\n• 清醒时间：${ageMonths < 3 ? '45分钟-1小时' : ageMonths < 6 ? '1.5-2.5小时' : '2.5-4小时'}\n\n【培养方法】\n1. 固定作息：每天同一时间哄睡\n2. 睡前仪式：洗澡→抚触→喂奶→入睡\n3. 自主入睡：减少抱睡、奶睡\n4. 睡眠环境：室温22-24°C，适当遮光\n5. 夜醒处理：先观察，再轻拍安抚`,
      tag: '睡眠培养',
      icon: '😴',
      action: 'view_detail',
      actionParam: 'ai_suggestion',
    },
    {
      type: 'ai_suggestion',
      title: '发育异常信号',
      summary: '这些情况需要引起重视，及时咨询医生',
      detail: `【${ageStr}发育预警信号】\n\n【大运动】\n• 3月不会抬头\n• 6月不会翻身\n• 9月不会坐\n• 12月不会爬、不会扶站\n\n【精细运动】\n• 3月不抓握\n• 6月不换手\n• 12月不会捏物\n\n【语言】\n• 6月不会发声\n• 12月不会叫爸妈\n• 18月不会说单字\n\n【社交】\n• 6月不认人\n• 12月不挥手再见\n\n如发现异常，及时就医评估`,
      tag: '发育提醒',
      icon: '⚠️',
      action: 'view_detail',
      actionParam: 'ai_suggestion',
    },
    // 亲子互动
    {
      type: 'ai_suggestion',
      title: '安全防护指南',
      summary: '宝宝会翻会爬后，这些安全措施要做好',
      detail: `【家庭安全检查清单】\n\n• 家具防护：桌角、墙角安装防撞条\n• 插座保护：所有插座装上安全塞\n• 楼梯防护：楼梯口安装安全门\n• 厨房安全：刀具、清洁剂放在高位\n• 卫生间：马桶盖装锁，浴缸防滑\n• 窗户安全：窗户装限位器\n• 药品管理：所有药品锁柜子里\n• 小物品：直径小于3cm的物品远离宝宝`,
      tag: '安全防护',
      icon: '🔒',
      action: 'view_detail',
      actionParam: 'ai_suggestion',
    },
    {
      type: 'ai_suggestion',
      title: '疫苗接种指南',
      summary: '按时接种疫苗，给宝宝最有效的保护',
      detail: `【一类疫苗（免费）接种时间】\n\n• 出生：卡介苗、乙肝①\n• 1月：乙肝②\n• 2月：脊灰①\n• 3月：脊灰②、百白破①\n• 4月：脊灰③、百白破②\n• 5月：百白破③\n• 6月：乙肝③、A群流脑①\n• 8月：麻风、乙脑①\n• 9月：A群流脑②\n• 12月：水痘\n\n【二类疫苗（自费）建议】\n• 五联疫苗：替代脊灰+百白破\n• 13价肺炎：2、4、6、12月\n• 手足口：6月龄起\n• 水痘：1岁、4岁\n\n灭活疫苗可同时接种`,
      tag: '疫苗接种',
      icon: '💉',
      action: 'view_detail',
      actionParam: 'ai_suggestion',
    },
    {
      type: 'ai_suggestion',
      title: '亲子阅读时光',
      summary: '早期阅读促进语言发育，越早开始越好',
      detail: `【${ageStr}绘本推荐】\n\n• 黑白卡/彩色卡（0-3月）：刺激视觉发育\n•布书（3-6月）：可咬可洗，材质安全\n• 触摸书（6-12月）：不同材质促进触觉\n• 翻翻书（6-12月）：锻炼精细动作\n• 简单故事书（12月+）：简短重复的句子\n\n【阅读方法】\n• 每天固定时间读\n• 语调夸张、表情丰富\n• 指着图片说名称\n• 让宝宝翻页、触摸\n• 读完可以讨论图片内容`,
      tag: '亲子阅读',
      icon: '📚',
      action: 'view_detail',
      actionParam: 'ai_suggestion',
    },
  ];
}

export const FEED_CARD_COLORS = {
  milestone: { bg: '#EEF3FF', text: '#4A6CF7', iconBg: '#E8EDFF' },
  daily_summary: { bg: '#FFF0F0', text: '#FF6E68', iconBg: '#FFE8E7' },
  vaccine_alert: { bg: '#FFF8E7', text: '#F59E0B', iconBg: '#FFF4DC' },
  feeding_tip: { bg: '#F0FFF4', text: '#52C41A', iconBg: '#E8F9EE' },
  health_reminder: { bg: '#FFF0F8', text: '#EB2F96', iconBg: '#FFE8F2' },
  ai_suggestion: { bg: '#F5F0FF', text: '#722ED1', iconBg: '#F0E8FF' },
};
