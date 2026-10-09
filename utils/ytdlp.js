const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to optional cookies file for Instagram authentication
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

/**
 * Check if a cookies file exists for authenticated requests
 * @returns {boolean}
 */
function hasCookiesFile() {
  return fs.existsSync(COOKIES_FILE);
}

/**
 * Get common yt-dlp args (cookies, etc.)
 * @param {string} platform - The platform name (youtube, instagram, pinterest)
 * @returns {string[]} Additional args
 */
function getAuthArgs(platform) {
  const args = [];
  // Use cookies file if it exists (for Instagram authentication or general session)
  if (hasCookiesFile()) {
    args.push('--cookies', COOKIES_FILE);
  }
  // Bypass YouTube bot/PO token challenges using android+web player client API
  if (platform === 'youtube' || !platform) {
    args.push('--extractor-args', 'youtube:player_client=android,web');
  }
  // Standard modern browser user-agent to avoid blocking
  args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
  return args;
}

/**
 * Resolves the best available yt-dlp executable path and any required argument prefixes.
 * Priority:
 * 1. Local standalone binary in project root (bin/yt-dlp.exe or bin/yt-dlp)
 * 2. Explicit environment variable YTDLP_PATH
 * 3. Standard Windows Python installation directories (Python installations Scripts yt-dlp.exe)
 * 4. System PATH 'yt-dlp'
 * @returns {{ command: string, argsPrefix: string[] }}
 */
function getYtdlpExecution() {
  // 1. Local standalone binary (completely independent of PATH and Python)
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const localBinary = path.join(__dirname, '..', 'bin', binaryName);
  if (fs.existsSync(localBinary)) {
    return { command: localBinary, argsPrefix: [] };
  }

  // 2. Environment variable override
  if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
    return { command: process.env.YTDLP_PATH, argsPrefix: [] };
  }

  // 3. Known Windows Python user & system installation locations
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const appData = process.env.APPDATA || '';
    const candidateDirs = [
      path.join(localAppData, 'Programs', 'Python'),
      path.join(appData, 'Python'),
      'C:\\Python313',
      'C:\\Python312',
      'C:\\Python311',
      'C:\\Python310',
      'C:\\Program Files\\Python313',
      'C:\\Program Files\\Python312',
      'C:\\Program Files\\Python311',
      'C:\\Program Files\\Python310'
    ];

    for (const baseDir of candidateDirs) {
      if (fs.existsSync(baseDir)) {
        try {
          const entries = fs.readdirSync(baseDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const scriptsExe = path.join(baseDir, entry.name, 'Scripts', 'yt-dlp.exe');
              if (fs.existsSync(scriptsExe)) {
                return { command: scriptsExe, argsPrefix: [] };
              }
            }
          }
        } catch (e) {}

        const directScriptsExe = path.join(baseDir, 'Scripts', 'yt-dlp.exe');
        if (fs.existsSync(directScriptsExe)) {
          return { command: directScriptsExe, argsPrefix: [] };
        }
      }
    }
  }

  // 4. Fallback to standard command on PATH
  return { command: 'yt-dlp', argsPrefix: [] };
}

/**
 * Spawns yt-dlp using the resolved executable path
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} [options]
 * @returns {import('child_process').ChildProcess}
 */
function spawnYtdlp(args, options = {}) {
  const { command, argsPrefix } = getYtdlpExecution();
  const finalArgs = [...argsPrefix, ...args];
  return spawn(command, finalArgs, { windowsHide: true, ...options });
}

/**
 * Filter formats to include useful video formats and always provide a fallback.
 * Handles YouTube (standard resolutions), Instagram/Pinterest (non-standard or single format).
 * @param {Array} rawFormats
 * @returns {Array} Normalized formats
 */
function normalizeFormats(rawFormats, info = {}) {
  const formats = [];
  const targetResolutions = ['360', '720', '1080'];
  const formatsList = Array.isArray(rawFormats) ? rawFormats : [];

  // Filter video formats (has video codec or is not audio-only)
  const videoFormats = formatsList.filter(f => {
    if (f.vcodec === 'none') return false;
    // Accept if vcodec is present or if ext/format indicates video
    return f.vcodec || f.height || f.width || (f.ext && f.ext !== 'm4a' && f.ext !== 'mp3');
  });

  // Try to find standard resolutions (works well for YouTube)
  for (const res of targetResolutions) {
    const resFormats = videoFormats.filter(
      (f) => f.height && f.height.toString() === res
    );
    if (resFormats.length > 0) {
      // Prefer mp4 with both audio and video
      resFormats.sort((a, b) => {
        if (a.ext === 'mp4' && b.ext !== 'mp4') return -1;
        if (a.ext !== 'mp4' && b.ext === 'mp4') return 1;
        if (a.acodec !== 'none' && b.acodec === 'none') return -1;
        if (a.acodec === 'none' && b.acodec !== 'none') return 1;
        return 0;
      });

      const bestFormat = resFormats[0];
      const hasAudio = bestFormat.acodec && bestFormat.acodec !== 'none';
      formats.push({
        quality: `${res}p`,
        formatId: bestFormat.format_id || 'best',
        ext: bestFormat.ext || 'mp4',
        filesize: bestFormat.filesize || bestFormat.filesize_approx || null,
        label: `${res}p ${(bestFormat.ext || 'mp4').toUpperCase()}${!hasAudio ? ' (No Audio)' : ''}`,
        hasAudio: hasAudio
      });
    }
  }

  // Check if there is a separate audio-only stream (e.g. DASH audio in Instagram / YouTube)
  const hasSeparateAudioStream = formatsList.some(f => 
    (f.vcodec === 'none' || !f.vcodec) && ((f.acodec && f.acodec !== 'none') || f.ext === 'm4a' || f.ext === 'mp3' || f.asr)
  );

  // FALLBACK 1: If no standard resolutions were found (Instagram Reels, Pinterest Pins, TikTok, etc.),
  // collect available video formats or height options
  if (formats.length === 0 && videoFormats.length > 0) {
    const seenHeights = new Set();
    const sortedVideoFormats = [...videoFormats].sort((a, b) => {
      // Prioritize formats with audio over silent formats
      const aAudio = (a.acodec && a.acodec !== 'none') ? 1 : 0;
      const bAudio = (b.acodec && b.acodec !== 'none') ? 1 : 0;
      if (aAudio !== bAudio) return bAudio - aAudio;

      const heightDiff = (b.height || 0) - (a.height || 0);
      if (heightDiff !== 0) return heightDiff;
      if (a.ext === 'mp4' && b.ext !== 'mp4') return -1;
      if (a.ext !== 'mp4' && b.ext === 'mp4') return 1;
      return 0;
    });

    for (const fmt of sortedVideoFormats) {
      const h = fmt.height ? `${fmt.height}p` : (fmt.format_note || 'HD Video');
      if (seenHeights.has(h)) continue;
      seenHeights.add(h);

      // Format has audio if it contains an audio codec directly OR if a separate audio stream will be muxed by yt-dlp
      const hasAudio = (fmt.acodec && fmt.acodec !== 'none') || hasSeparateAudioStream;
      formats.push({
        quality: fmt.height ? `${fmt.height}p` : 'Video',
        formatId: fmt.format_id || 'best',
        ext: fmt.ext || 'mp4',
        filesize: fmt.filesize || fmt.filesize_approx || null,
        label: `${h} ${(fmt.ext || 'MP4').toUpperCase()}${!hasAudio ? ' (No Audio)' : ''}`,
        hasAudio: hasAudio
      });

      if (formats.length >= 4) break;
    }
  }

  // FALLBACK 2: If no video formats were extracted yet (e.g. Pinterest direct URL or single stream info)
  const hasVideoFormat = formats.some(f => f.quality !== 'audio');
  if (!hasVideoFormat && (videoFormats.length > 0 || (info.formats && info.formats.length > 0))) {
    formats.push({
      quality: 'best',
      formatId: 'best',
      ext: info.ext || 'mp4',
      filesize: info.filesize || info.filesize_approx || null,
      label: 'Best MP4',
      hasAudio: true
    });
  }

  // Add audio option only if video formats or raw formats exist
  if (formats.length > 0 || (rawFormats && rawFormats.length > 0)) {
    formats.push({
      quality: 'audio',
      formatId: 'bestaudio',
      ext: 'mp3',
      filesize: null,
      label: 'MP3',
      hasAudio: true
    });
  }

  return formats;
}

/**
 * Parse yt-dlp stderr for known error messages
 * @param {string} stderr 
 * @returns {string} 
 */
function parseYtdlpError(stderr, stdout = '') {
  const combined = `${stderr || ''}\n${stdout || ''}`;
  const errStr = combined.toLowerCase();
  if (errStr.includes('private video')) return 'This video is private.';
  if (errStr.includes('video unavailable') || errStr.includes('this video is not available')) return 'This video is unavailable in your region or has been removed.';
  if (errStr.includes('failed to decrypt with dpapi')) return 'Browser cookie decryption failed. Please configure cookies.txt directly on the homepage.';
  if (errStr.includes('sign in to confirm') || errStr.includes('login required')) return 'This content requires authentication. Please set up cookies.';
  if (errStr.includes('checkpoint_required') || errStr.includes('challenge_required') || errStr.includes('feedback_required')) return 'Instagram security checkpoint triggered. Please configure cookies (see Settings on the homepage).';
  if (errStr.includes('empty media response') || errStr.includes('rate-limit reached') || errStr.includes('content is not available')) return 'Instagram requires authentication. Please configure cookies (see Settings on the homepage).';
  if (errStr.includes('no video formats found') || errStr.includes('no formats found')) return 'No downloadable video found on this page. The Pin may contain only an image or is unavailable.';
  if (errStr.includes('requested format is not available')) return 'The requested video format is not available for this media.';
  if (errStr.includes('no audio stream') || errStr.includes('does not contain audio')) return 'This video does not contain an audio track to extract.';
  if (errStr.includes('http error 429') || errStr.includes('too many requests')) return 'You are being rate limited. Please wait a minute and try again.';
  if (errStr.includes('http error 404') || errStr.includes('not found')) return 'Content not found. Please check the URL is correct.';
  if (errStr.includes('unsupported url')) return 'This URL is not supported. Please use a direct video link.';
  if (errStr.includes('http error 403')) return 'Access denied by the platform. Try again later.';
  if (errStr.includes('is not a valid url') || errStr.includes('invalid url')) return 'Invalid URL format. Please paste a valid video link.';
  if (errStr.includes('is a playlist') || (errStr.includes('playlist') && errStr.includes('use --yes-playlist'))) return 'This URL points to a playlist. Please provide a link to an individual video.';
  if (errStr.includes('it\'s a channel') || errStr.includes('user profile') || errStr.includes('it\'s a user') || errStr.includes('channel_id')) return 'This URL points to a profile or channel page. Please provide a direct video link.';
  if (errStr.includes('members-only') || errStr.includes('subscribers-only')) return 'This video is restricted to channel members or subscribers.';
  if (errStr.includes('premieres in') || errStr.includes('live event will begin')) return 'This video has not premiered yet.';
  if (errStr.includes('removed by the uploader') || errStr.includes('copyright claim')) return 'This video has been removed by the uploader or due to copyright.';
  if (errStr.includes('only images are available')) return 'This post contains only images, not a downloadable video.';
  if (errStr.includes('geo') || errStr.includes('not available in your country')) return 'This content is geo-restricted and not available in your country.';
  if (errStr.includes('age') || errStr.includes('age-restricted')) return 'This content is age-restricted and requires account authentication.';
  if (errStr.includes('network') || errStr.includes('connection') || errStr.includes('timeout')) return 'Network error. Please check your internet connection and try again.';

  // Comprehensive multi-line error extraction:
  const lines = combined.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // 1. Look for explicit ERROR: or error: line
  for (const line of lines) {
    const errorMatch = line.match(/(?:ERROR|error):\s*(?:\[[^\]]+\]\s*)?(?:[^\s:]+:\s*)?([^\r\n]+)/i);
    if (errorMatch && errorMatch[1]) {
      const clean = errorMatch[1].replace(/https?:\/\/[^\s]+/g, '').replace(/use --[^\s]+/gi, '').trim();
      if (clean.length > 5 && !clean.toLowerCase().includes('failed to parse')) {
        return clean;
      }
    }
  }

  // 2. Look for Python exception / ExtractorError lines
  for (const line of lines) {
    const match = line.match(/^(?:[A-Za-z]+Error|Exception):\s*(.+)/i);
    if (match && match[1]) {
      const clean = match[1].replace(/https?:\/\/[^\s]+/g, '').trim();
      if (clean.length > 5) return clean;
    }
  }

  // 3. Look for descriptive lines with failure keywords
  for (const line of lines) {
    if (/(?:unable to|failed to|not found|forbidden|unsupported|unavailable|restricted|checkpoint|challenge)/i.test(line)) {
      const clean = line.replace(/https?:\/\/[^\s]+/g, '').replace(/^\[[^\]]+\]\s*/, '').trim();
      if (clean.length > 5) return clean;
    }
  }

  return 'Failed to fetch video information. Please verify the URL is a valid public video link.';
}

/**
 * Spawns yt-dlp to get video information
 * @param {string} url
 * @param {string} platform - The detected platform name
 * @returns {Promise<object>} Video info
 */
function getVideoInfo(url, platform = '') {
  return new Promise((resolve, reject) => {
    const authArgs = getAuthArgs(platform);
    const args = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--no-playlist',
      '--skip-download',
      '--socket-timeout', '15',
      ...authArgs,
      url
    ];
    const ytProcess = spawnYtdlp(args, { windowsHide: true });
    
    let stdoutData = '';
    let stderrData = '';

    // Set 60-second timeout
    const timeout = setTimeout(() => {
      ytProcess.kill();
      reject(new Error('Request timed out after 60 seconds'));
    }, 60000);

    ytProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    ytProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    ytProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code !== 0) {
        console.error(`[yt-dlp stderr exit code ${code}]:`, (stderrData || '').trim());
        const errorMsg = parseYtdlpError(stderrData, stdoutData);
        return reject(new Error(errorMsg));
      }

      try {
        const info = JSON.parse(stdoutData);
        // Handle playlists or multi-item posts (Instagram carousels / albums)
        const targetInfo = (Array.isArray(info.entries) && info.entries.length > 0)
          ? (info.entries.find(e => e && ((e.formats && e.formats.length > 0) || e.vcodec)) || info.entries[0])
          : info;

        const formats = normalizeFormats(targetInfo.formats, targetInfo);

        // Check if there are no video formats found
        const hasVideo = formats.some(f => f.quality !== 'audio');
        if (!hasVideo && (!targetInfo.formats || targetInfo.formats.length === 0)) {
          if (targetInfo.thumbnails && targetInfo.thumbnails.length > 0) {
            if (platform === 'instagram') {
              return reject(new Error('This Instagram post contains an image, not a video. Please provide a link to a video or Reel.'));
            }
            return reject(new Error('This Pinterest pin contains an image, not a video. Please provide a link to a video Pin.'));
          }
          return reject(new Error('No downloadable video found on this page.'));
        }
        
        const normalizedInfo = {
          id: targetInfo.id || info.id,
          title: targetInfo.title || info.title || 'Untitled',
          thumbnail: targetInfo.thumbnail || targetInfo.thumbnails?.[0]?.url || info.thumbnail || '',
          duration: targetInfo.duration || info.duration || 0,
          uploader: targetInfo.uploader || targetInfo.channel || targetInfo.creator || info.uploader || 'Unknown',
          platform: info.extractor || targetInfo.extractor,
          formats: formats
        };

        resolve(normalizedInfo);
      } catch (err) {
        if (err.message && (err.message.includes('image, not a video') || err.message.includes('No downloadable video'))) {
          reject(err);
        } else {
          reject(new Error('Failed to parse video information from yt-dlp.'));
        }
      }
    });

    ytProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error('yt-dlp is not installed or not found on PATH.'));
    });
  });
}

/**
 * Download stream for a specific video format with parallel fragment downloading (-N 8)
 * @param {string} url 
 * @param {string} formatId 
 * @param {string} platform - The detected platform name
 * @returns {{ stream: import('stream').Readable, process: import('child_process').ChildProcess }}
 */
function downloadStream(url, formatId, platform = '') {
  const authArgs = getAuthArgs(platform);
  
  let formatSpec;
  if (formatId === 'best') {
    formatSpec = (platform === 'pinterest' || platform === 'instagram')
      ? 'bestvideo+bestaudio/best' 
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
  } else if (platform === 'pinterest') {
    formatSpec = `${formatId}/best`;
  } else if (platform === 'instagram') {
    formatSpec = `${formatId}+bestaudio/${formatId}/best`;
  } else {
    formatSpec = `${formatId}+bestaudio/${formatId}`;
  }

  const args = [
    '-f', formatSpec,
    '--merge-output-format', 'mp4',
    '-o', '-',
    '--no-warnings',
    '--no-check-certificates',
    '--no-playlist',
    '--no-mtime',
    '-N', '8',
    '--socket-timeout', '15',
    ...authArgs,
    url
  ];
  const ytProcess = spawnYtdlp(args, { windowsHide: true });
  return { stream: ytProcess.stdout, process: ytProcess };
}

/**
 * Download audio stream with multi-threaded fragment fetching
 * @param {string} url 
 * @param {string} platform - The detected platform name
 * @returns {{ stream: import('stream').Readable, process: import('child_process').ChildProcess }}
 */
function downloadAudio(url, platform = '') {
  const authArgs = getAuthArgs(platform);
  const args = [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', '-',
    '--no-warnings',
    '--no-check-certificates',
    '--no-playlist',
    '--no-mtime',
    '-N', '8',
    '--socket-timeout', '15',
    ...authArgs,
    url
  ];
  const ytProcess = spawnYtdlp(args, { windowsHide: true });
  return { stream: ytProcess.stdout, process: ytProcess };
}

module.exports = {
  getVideoInfo,
  downloadStream,
  downloadAudio,
  hasCookiesFile,
  COOKIES_FILE,
  normalizeFormats,
  parseYtdlpError,
  getYtdlpExecution,
  spawnYtdlp
};
