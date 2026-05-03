import * as Updates from 'expo-updates';

/**
 * 检查并应用 EAS Update
 * @returns {Promise<{available: boolean, isLoading: boolean, error: Error|null}>}
 */
export async function checkForUpdate() {
  if (!Updates.isEnabled) {
    return { available: false, isLoading: false, error: new Error('Updates not enabled') };
  }

  try {
    const update = await Updates.checkAsync();
    return { available: update.isAvailable, isLoading: false, error: null, update };
  } catch (error) {
    return { available: false, isLoading: false, error };
  }
}

/**
 * 下载并应用更新（需要先调用 checkForUpdate 确认有更新）
 */
export async function downloadAndApplyUpdate() {
  try {
    await Updates.fetchUpdateAsync();
    // 下次启动时自动应用
    return { reloaded: true, error: null };
  } catch (error) {
    return { reloaded: false, error };
  }
}

/**
 * 应用已下载的更新（无需重启）
 */
export async function applyUpdate() {
  if (Updates.isUpdateAvailable) {
    await Updates.reloadAsync();
  }
}

/**
 * 获取当前更新渠道
 */
export function getUpdateChannel() {
  return Updates.channel;
}
