const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const BINARY_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const TARGET_PATH = path.join(BIN_DIR, BINARY_NAME);

function getDownloadUrl() {
  if (IS_WIN) {
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  } else if (IS_MAC) {
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  }
  return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve(dest));
      });
      fileStream.on('error', (err) => {
        try { fs.unlinkSync(dest); } catch (e) {}
        reject(err);
      });
    }).on('error', reject);
  });
}

async function ensureYtdlp() {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  if (fs.existsSync(TARGET_PATH)) {
    try {
      const ver = execFileSync(TARGET_PATH, ['--version']).toString().trim();
      console.log(`[yt-dlp] Local standalone binary verified at ${TARGET_PATH} (v${ver})`);
      return TARGET_PATH;
    } catch (e) {
      console.warn(`[yt-dlp] Existing binary at ${TARGET_PATH} failed execution test, re-downloading...`);
    }
  }

  console.log(`[yt-dlp] Downloading official standalone yt-dlp binary...`);
  const url = getDownloadUrl();
  await downloadFile(url, TARGET_PATH);
  if (!IS_WIN) {
    fs.chmodSync(TARGET_PATH, 0o755);
  }

  const ver = execFileSync(TARGET_PATH, ['--version']).toString().trim();
  console.log(`[yt-dlp] Successfully installed yt-dlp v${ver} to ${TARGET_PATH}`);
  return TARGET_PATH;
}

if (require.main === module) {
  ensureYtdlp()
    .then(() => process.exit(0))
    .catch((err) => {
      console.warn('[yt-dlp] Setup notice:', err.message);
      // Do not block npm install if offline or firewalled; fallback resolver will handle it
      process.exit(0);
    });
}

module.exports = { ensureYtdlp, TARGET_PATH };
