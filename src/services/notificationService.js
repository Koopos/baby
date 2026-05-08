import * as Notifications from 'expo-notifications';
import * as Platform from 'react-native';

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 请求通知权限
 * @returns {Promise<boolean>} 是否获得授权
 */
export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * 检查是否已有通知权限
 */
export async function checkPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * 调度一个每日重复的本地通知
 * @param {object} reminder - 提醒对象 { id, type, title, time }
 * @returns {Promise<string>} 调度的通知 identifier
 */
export async function scheduleReminder(reminder) {
  const [hour, minute] = reminder.time.split(':').map(Number);

  // 计算下一次触发的日期
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  // 如果今天已过，则排到明天
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: getReminderBody(reminder.type),
      data: { reminderId: reminder.id, type: reminder.type },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

/**
 * 取消指定提醒的通知
 * @param {string} identifier - scheduleNotificationAsync 返回的 id
 */
export async function cancelReminderNotification(identifier) {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * 根据类型返回通知正文
 */
function getReminderBody(type) {
  switch (type) {
    case 'feed': return '🍼 该喂奶啦';
    case 'diaper': return '🧷 该换尿布啦';
    case 'medicine': return '💊 该喂药啦';
    case 'checkup': return '👨‍⚕️ 体检时间到啦';
    default: return '📌 提醒时间到';
  }
}
