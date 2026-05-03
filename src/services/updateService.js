import * as Updates from 'expo-updates';

/**
 * 检查并应用 EAS Update
 * @returns {Promise<{available: boolean, isLoading: boolean, error: Error|null}>}
 */
export async function checkForUpdate() {
  if (!Updates || typeof Updates.checkAsync !== 'function') {
    return { available: false, isLoading: false, error: new Error('更新功能不可用') };
  }

  try {
    const update = await Updates.checkAsync();
    return { available: update.isAvailable, isLoading: false, error: null, update };
  } catch (error) {
    // 改善错误信息，帮助诊断
    let errorMsg = error.message || String(error);
    if (errorMsg.includes('network') || errorMsg.includes('Network') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('fetch')) {
      errorMsg = '网络连接失败，请检查网络后重试';
    } else if (errorMsg.includes('Updates not enabled')) {
      errorMsg = '更新功能未启用，请确认使用的是 EAS Build 打包的应用';
    }
    return { available: false, isLoading: false, error: new Error(errorMsg) };
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
