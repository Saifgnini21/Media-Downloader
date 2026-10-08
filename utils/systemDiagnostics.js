const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { hasCookiesFile, COOKIES_FILE } = require('./ytdlp');

let lastUpdateCheck = 0;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Gather complete system health status
 * @returns {Promise<object>}
 */
function getSystemHealth() {
  return new Promise((resolve) => {
    let ytdlpVersion = 'unknown';
    let ytdlpInstalled = false;
    let ffmpegVersion = 'unknown';
    let ffmpegInstalled = false;

    try {
      ytdlpVersion = execSync('yt-dlp --version', { timeout: 5000, windowsHide: true }).toString().trim();
      ytdlpInstalled = true;
    } catch (e) {
      ytdlpVersion = 'not found on PATH';
    }

    try {
      const ffmpegOutput = execSync('ffmpeg -version', { timeout: 5000, windowsHide: true }).toString();
      ffmpegVersion = ffmpegOutput.split('\n')[0].trim();
      ffmpegInstalled = true;
    } catch (e) {
      ffmpegVersion = 'not found on PATH';
    }

    let cookieSize = 0;
    if (hasCookiesFile()) {
      try {
        cookieSize = fs.statSync(COOKIES_FILE).size;
      } catch (e) {}
    }

    resolve({
      status: (ytdlpInstalled && ffmpegInstalled) ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      ytdlp: {
        installed: ytdlpInstalled,
        version: ytdlpVersion
      },
      ffmpeg: {
        installed: ffmpegInstalled,
        version: ffmpegVersion
      },
      cookies: {
        configured: hasCookiesFile(),
        path: COOKIES_FILE,
        sizeBytes: cookieSize
      },
      platformsSupported: 8
    });
  });
}

/**
 * Attempts to safely update yt-dlp to latest stable release
 * @returns {Promise<{ success: boolean, output: string }>}
 */
function autoUpdateYtdlp() {
  return new Promise((resolve) => {
    // Try pip update first, then yt-dlp -U fallback
    exec('python -m pip install -U yt-dlp', { timeout: 60000, windowsHide: true }, (pipErr, pipStdout) => {
      if (!pipErr) {
        lastUpdateCheck = Date.now();
        return resolve({ success: true, output: pipStdout.trim() });
      }

      exec('yt-dlp -U', { timeout: 60000, windowsHide: true }, (ytErr, ytStdout, ytStderr) => {
        lastUpdateCheck = Date.now();
        if (ytErr) {
          resolve({ success: false, output: ytStderr.trim() || ytErr.message });
        } else {
          resolve({ success: true, output: ytStdout.trim() });
        }
      });
    });
  });
}

/**
 * Periodically checks for yt-dlp updates in the background (at most once every 24h)
 */
function scheduleAutoUpdate() {
  const now = Date.now();
  if (now - lastUpdateCheck < TWENTY_FOUR_HOURS) {
    return;
  }
  
  console.log('[Maintenance] Checking for yt-dlp updates in background...');
  autoUpdateYtdlp()
    .then((res) => {
      if (res.success) {
        console.log('[Maintenance] yt-dlp is up to date.');
      } else {
        console.log('[Maintenance] Update check completed:', res.output);
      }
    })
    .catch((err) => {
      console.warn('[Maintenance] Auto-update check skipped:', err.message);
    });
}

module.exports = {
  getSystemHealth,
  autoUpdateYtdlp,
  scheduleAutoUpdate
};
