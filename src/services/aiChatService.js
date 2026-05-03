/**
 * AI 聊天服务 - 接入 mmx 文字对话
 * 育儿助手，根据宝宝月龄提供个性化建议
 */

let apiKey = '';

export function setApiKey(key) {
  apiKey = key;
}

export async function sendChatMessage(messages, babyInfo = {}) {
  if (!apiKey) {
    throw new Error('请先配置 API Key');
  }

  // 构建系统提示词
  const { name = '宝宝', age = '', gender = '男', weight = '', height = '' } = babyInfo;
  const ageStr = age ? `${age}月龄` : '';
  const genderStr = gender === '男' ? '男宝' : '女宝';

  const systemPrompt = `你是「宝贝成长助手」，一位专业、温柔的育儿顾问。

背景信息：
- 宝宝姓名：${name}
- 月龄：${ageStr || '未知'}
- 性别：${genderStr}
- 体重：${weight ? weight + 'kg' : '未知'}
- 身高：${height ? height + 'cm' : '未知'}

你的职责：
1. 回答 0-3 岁婴幼儿养护问题（喂养、睡眠、健康、发育早教）
2. 回复要专业但易懂，语气温暖亲切，像朋友聊天
3. 涉及疾病/异常症状，建议就医，不替代医生诊断
4. 回答控制在 200 字以内，分点清晰

请用中文回复。`;

  const body = {
    model: 'MiniMax-M2',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 500,
    temperature: 0.7,
  };

  const response = await fetch('https://api.minimaxi.com/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`请求失败：${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '抱歉，暂时没有收到回复。';
}
