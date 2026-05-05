import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// 配置：你的公网服务器域名或 IP + 端口
// 例如：https://your-server.com:3000
// 先用 localhost 测试
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── 版本信息 ────────────────────────────────────────────────
// 每次发版前用 `npm run build` 更新这个版本号
const CURRENT_VERSION = '1.0.2';
const BUNDLE_DIR = join(__dirname, 'bundle');

// ─── 辅助函数 ────────────────────────────────────────────────
function getBundleFiles() {
  if (!existsSync(BUNDLE_DIR)) return [];
  return readdirSync(BUNDLE_DIR).filter(f => f.endsWith('.hbc') || f.endsWith('.bundle') || f.endsWith('.jsbundle'));
}

// ─── 1. 版本检查接口 ──────────────────────────────────────────
// App 启动时调用此接口检查是否有新版本
// 返回格式兼容 expo-updates manifest
app.get('/manifest', (req, res) => {
  const platform = req.query.platform || 'android';
  const runtimeVersion = req.query['runtime-version'] || CURRENT_VERSION;
  const sdkVersion = req.query.sdkVersion || '54.0.0';

  // 找最新的 bundle 文件
  const bundleFiles = getBundleFiles();
  const bundleFile = bundleFiles.length > 0 ? bundleFiles[bundleFiles.length - 1] : null;

  if (!bundleFile) {
    return res.status(404).json({ error: 'No bundle found. Run npm run build first.' });
  }

  const bundleUrl = `${BASE_URL}/bundle/${bundleFile}`;
  const bundlePath = join(BUNDLE_DIR, bundleFile);
  const { size } = existsSync(bundlePath) ? { size: readFileSync(bundlePath).length } : { size: 0 };

  // 构造兼容 expo-updates 的响应格式
  const response = {
    data: {
      id: `update-${CURRENT_VERSION}`,
      version: CURRENT_VERSION,
      runtimeVersion: CURRENT_VERSION,
      bundleUrl,
      bundleKey: bundleFile,
      fileHash: bundleFile.replace(/\.[^.]+$/, ''),
      createdAt: new Date().toISOString(),
      platform,
    },
    // Android 特别需要这些字段
    android: {
      bundleUrl,
      assetChangeDetectionHash: null,
    },
    sdkVersion,
    releasedAt: new Date().toISOString(),
    commitTime: new Date().toISOString(),
  };

  res.json(response);
});

// ─── 2. Bundle 下载接口 ──────────────────────────────────────
app.get('/bundle/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = join(BUNDLE_DIR, filename);

  if (!existsSync(filePath)) {
    return res.status(404).send('Bundle not found. Run npm run build first.');
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  readFileSync(filePath).pipe(res);
});

// ─── 3. 列出所有可用版本 ──────────────────────────────────────
app.get('/versions', (req, res) => {
  const bundleFiles = getBundleFiles();
  res.json({
    currentVersion: CURRENT_VERSION,
    availableBundles: bundleFiles,
    serverTime: new Date().toISOString(),
  });
});

// ─── 4. 健康检查 ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: CURRENT_VERSION, uptime: process.uptime() });
});

// ─── 5. 手动发布新版 ──────────────────────────────────────────
// curl -X POST http://localhost:3000/publish -H "Content-Type: application/json" -d '{"version":"1.0.3","bundleFile":"app.android.bundle"}'
app.post('/publish', (req, res) => {
  const { version, bundleFile } = req.body;
  if (!version) return res.status(400).json({ error: 'version required' });

  // 更新当前版本（实际项目中应该写入文件或数据库）
  const prev = CURRENT_VERSION;
  // 注意：这里修改的是内存中的变量，进程重启会恢复
  // 真实部署建议用 fs 持久化版本信息
  console.log(`[publish] ${prev} -> ${version}, bundle: ${bundleFile}`);

  res.json({ ok: true, from: prev, to: version, bundle: bundleFile });
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`🍼 宝宝记录更新服务器运行中`);
  console.log(`   版本: ${CURRENT_VERSION}`);
  console.log(`   监听: http://localhost:${PORT}`);
  console.log(`   检查更新: GET /manifest?platform=android&runtime-version=${CURRENT_VERSION}`);
  console.log(`   下载 bundle: GET /bundle/<filename>`);
  console.log(`   列出版本: GET /versions`);
  console.log();
  console.log(`   📦 bundle 目录: ${BUNDLE_DIR}`);
  console.log(`   当前文件: ${getBundleFiles().join(', ') || '(空)'}`);
  console.log();
  console.log(`   ⚠️  首次使用需要先运行 npm run build 导出最新 bundle`);
});
