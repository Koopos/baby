/**
 * 自托管更新服务
 * 不依赖 EAS Update，使用自己的更新服务器
 *
 * 服务器部署步骤：
 * 1. 将 server/ 目录上传到你的公网服务器
 * 2. 修改 server/index.js 中的 BASE_URL 为服务器地址
 * 3. cd server && npm install && npm start
 * 4. 每次发版运行: npm run build (在 server/ 目录)
 */

import { Updates } from 'expo-updates';
import * as FileSystem from 'expo-file-system';

// ─── 配置 ─────────────────────────────────────────────────────
// 改成你的更新服务器地址
const UPDATE_SERVER_URL = 'http://YOUR_SERVER_IP:3000';

// ─── 版本信息 ─────────────────────────────────────────────────
// app.json 中的版本号需要与 server/version.json 保持一致
// 每次发版前同步更新
export function getCurrentVersion() {
  try {
    // 这是 app.json 里的 version
    const pkg = require('../../app.json');
    return pkg.expo.version;
  } catch {
    return '1.0.0';
  }
}

// ─── 检查更新 ─────────────────────────────────────────────────
export async function checkForUpdate() {
  try {
    // 方式一：通过 expo-updates（需要 app.json 配置正确的 updates.url）
    if (Updates && typeof Updates.checkAsync === 'function') {
      const update = await Updates.checkAsync();
      return {
        available: update.isAvailable,
        isLoading: false,
        error: null,
        update,
        method: 'expo-updates',
      };
    }

    // 方式二：自实现 HTTP 检查（不依赖 expo-updates 的 URL 配置）
    const currentVersion = getCurrentVersion();
    const url = `${UPDATE_SERVER_URL}/manifest?platform=android&runtime-version=${currentVersion}&sdkVersion=54.0.0`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      // 404 说明没有新版本（服务器上没有更新包）
      if (response.status === 404) {
        return { available: false, isLoading: false, error: null, method: 'self-hosted' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest = await response.json();
    const latestVersion = manifest.data?.version || manifest.version || currentVersion;

    // 版本比较（简单比较，真实场景用 semver）
    const needsUpdate = latestVersion !== currentVersion;

    return {
      available: needsUpdate,
      isLoading: false,
      error: null,
      update: {
        manifest,
        latestVersion,
        currentVersion,
        bundleUrl: manifest.data?.bundleUrl || manifest.android?.bundleUrl,
      },
      method: 'self-hosted',
    };
  } catch (error) {
    return {
      available: false,
      isLoading: false,
      error,
      method: 'self-hosted',
    };
  }
}

// ─── 下载并应用更新 ─────────────────────────────────────────────
export async function downloadAndApplyUpdate() {
  try {
    // 优先使用 expo-updates 内置机制
    if (Updates && typeof Updates.fetchUpdateAsync === 'function') {
      const result = await Updates.fetchUpdateAsync();
      return {
        reloaded: true,
        error: null,
        method: 'expo-updates',
      };
    }

    // 自实现下载（备用）
    const { update } = await checkForUpdate();
    if (!update?.bundleUrl) {
      return { reloaded: false, error: new Error('没有可用的更新'), method: 'self-hosted' };
    }

    const bundleUri = `${FileSystem.cacheDirectory}bundle.hbc`;

    // 下载 bundle
    const { uri: downloadedUri } = await FileSystem.downloadAsync(
      update.bundleUrl,
      bundleUri
    );

    // 将下载的 bundle 写入本地更新目录
    // Android 上 expo-updates 会从这个目录读取
    const updateDir = `${FileSystem.bundleDirectory}`;
    await FileSystem.makeDirectoryAsync(updateDir, { intermediates: true }).catch(() => {});
    await FileSystem.copyAsync({ from: downloadedUri, to: `${updateDir}app.android.bundle` });

    // 下次启动加载新 bundle
    return { reloaded: true, error: null, method: 'self-hosted' };
  } catch (error) {
    return { reloaded: false, error, method: 'self-hosted' };
  }
}

// ─── 重启应用加载新版本 ────────────────────────────────────────
export async function applyUpdate() {
  try {
    if (Updates?.isUpdateAvailable) {
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('应用更新失败:', error);
  }
}

// ─── 启动时自动检查并更新 ─────────────────────────────────────
export async function initAutoUpdate() {
  try {
    const result = await checkForUpdate();
    if (result.available) {
      console.log(`📦 发现新版本 ${result.update?.latestVersion}，正在下载...`);
      const dlResult = await downloadAndApplyUpdate();
      if (dlResult.reloaded) {
        console.log('✅ 更新已下载，重启后生效');
        // 可选：立刻重启，或者等用户操作后重启
        // await applyUpdate();
      }
    }
  } catch (error) {
    console.error('自动更新失败:', error);
  }
}
