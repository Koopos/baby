/**
 * buildBundle.js
 * 从 dist/ 目录导出最新的 JS bundle 到 server/bundle/
 * 每次发版前运行一次: node buildBundle.js
 */
import { existsSync, copyFileSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist', '_expo', 'static', 'js', 'android');
const BUNDLE_DIR = join(__dirname, 'bundle');
const METADATA_FILE = join(__dirname, 'version.json');

// ─── 从 app.json 读取当前版本 ────────────────────────────────
function getVersion() {
  try {
    const appJson = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8'));
    return appJson.expo.version; // 如 "1.0.2"
  } catch {
    return '1.0.0';
  }
}

const version = getVersion();

// ─── 服务器地址（部署后改成你家服务器地址）─────────────────────────────
// 运行时通过环境变量覆盖：BASE_URL=http://192.168.1.200:3000 npm run build
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const bundleFiles = existsSync(DIST_DIR)
  ? readdirSync(DIST_DIR).filter(f => f.endsWith('.hbc'))
  : [];

if (bundleFiles.length === 0) {
  console.error('❌ 错误：dist/_expo/static/js/android/ 目录中没有找到 .hbc bundle 文件');
  console.error('   请先运行: npx expo export --platform android');
  process.exit(1);
}

// 取最新的 bundle（按文件名时间戳排序）
const latestBundle = bundleFiles.sort().at(-1);
const srcPath = join(DIST_DIR, latestBundle);
const destName = `app.android.${version}.hbc`;
const destPath = join(BUNDLE_DIR, destName);

// 确保目标目录存在
mkdirSync(BUNDLE_DIR, { recursive: true });

// 复制 bundle
copyFileSync(srcPath, destPath);

// 写版本元数据
const meta = {
  version,
  bundleFile: destName,
  sourceBundle: latestBundle,
  builtAt: timestamp,
  runtimeVersion: version,
};

writeFileSync(METADATA_FILE, JSON.stringify(meta, null, 2));

// ─── 生成静态文件供 nginx 使用 ─────────────────────────────────

// manifest.json：App 检查更新时请求此文件，格式兼容 expo-updates
const bundleUrl = `${BASE_URL}/bundle/${destName}`;
const manifest = {
  data: {
    id: `update-${version}`,
    version,
    runtimeVersion: version,
    bundleUrl,
    bundleKey: destName,
    createdAt: new Date().toISOString(),
    platform: 'android',
  },
  android: {
    bundleUrl,
  },
  sdkVersion: '54.0.0',
  releasedAt: new Date().toISOString(),
};
writeFileSync(join(BUNDLE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// versions.json：列出所有可用版本
const allBundles = readdirSync(BUNDLE_DIR).filter(f => f.endsWith('.hbc')).sort();
const versionsList = {
  currentVersion: version,
  availableBundles: allBundles,
  serverTime: new Date().toISOString(),
};
writeFileSync(join(BUNDLE_DIR, 'versions.json'), JSON.stringify(versionsList, null, 2));

console.log('✅ Bundle 导出成功！');
console.log(`   版本: ${version}`);
console.log(`   源文件: ${latestBundle}`);
console.log(`   输出文件: ${destName}`);
console.log(`   manifest.json: 已生成（供 nginx 使用）`);
console.log(`   versions.json: 已生成（${allBundles.length} 个版本）`);
console.log(`   路径: ${destPath}`);
console.log(`   导出时间: ${timestamp}`);
console.log();
console.log('📦 如需部署到服务器，请将 server/ 目录上传到你的公网服务器，然后：');
console.log(`   1. 修改 server/index.js 中的 BASE_URL 为你的服务器地址`);
console.log(`   2. 运行: cd server && npm install && npm start`);
console.log(`   3. 重启 App 即可收到更新`);
console.log();
console.log('📦 Nginx 部署（无需 Node.js）：');
console.log(`   1. 上传 server/bundle/ 下的所有文件到 /var/www/baby-update/bundle/`);
console.log(`   2. 使用 server/nginx-simple.conf 配置 nginx`);
console.log(`   3. 重载 nginx: sudo systemctl reload nginx`);
console.log(`   4. App 端 HOME_UPDATE_SERVER 设为 http://你家服务器IP:3000`);
console.log(`   5. 每次发版只更新 bundle/ 目录即可（buildBundle.js 已自动更新 manifest.json）`);
