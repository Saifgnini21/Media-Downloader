const fs = require('fs');
const path = require('path');
const os = require('os');
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

async function ensureYtdlp(destPath = null) {
  let target = destPath || TARGET_PATH;

  // Determine writable directory
  try {
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (e) {
    // Read-only filesystem (e.g. AWS Lambda / Vercel runtime)
    target = path.join(os.tmpdir(), BINARY_NAME);
  }

  if (fs.existsSync(target)) {
    try {
      const ver = execFileSync(target, ['--version']).toString().trim();
      console.log(`[yt-dlp] Local standalone binary verified at ${target} (v${ver})`);
      return target;
    } catch (e) {
      console.warn(`[yt-dlp] Existing binary at ${target} failed execution test, re-downloading...`);
    }
  }

  console.log(`[yt-dlp] Downloading official standalone yt-dlp binary to ${target}...`);
  const url = getDownloadUrl();
  try {
    await downloadFile(url, target);
  } catch (err) {
    // If target was in project dir and failed (e.g. read-only), retry in os.tmpdir()
    if (target !== path.join(os.tmpdir(), BINARY_NAME)) {
      target = path.join(os.tmpdir(), BINARY_NAME);
      await downloadFile(url, target);
    } else {
      throw err;
    }
  }

  if (!IS_WIN) {
    fs.chmodSync(target, 0o755);
  }

  const ver = execFileSync(target, ['--version']).toString().trim();
  console.log(`[yt-dlp] Successfully installed yt-dlp v${ver} to ${target}`);
  return target;
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
