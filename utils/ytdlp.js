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
  // Use cookies file if it exists (required for Instagram, helpful for others)
  if (hasCookiesFile()) {
    args.push('--cookies', COOKIES_FILE);
  } else if (platform === 'instagram') {
    // Try to extract cookies from browser as fallback
    args.push('--cookies-from-browser', 'chrome');
  }
  return args;
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

      const hasAudio = fmt.acodec && fmt.acodec !== 'none';
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
function parseYtdlpError(stderr) {
  const errStr = stderr.toLowerCase();
  if (errStr.includes('private video')) return 'This video is private.';
  if (errStr.includes('video unavailable') || errStr.includes('this video is not available')) return 'This video is unavailable in your region or has been removed.';
  if (errStr.includes('sign in to confirm') || errStr.includes('login required')) return 'This content requires authentication. Please set up cookies.';
  if (errStr.includes('empty media response') || errStr.includes('cookies')) return 'Instagram requires authentication. Please configure cookies (see Settings on the homepage).';
  if (errStr.includes('no video formats found') || errStr.includes('no formats found')) return 'No downloadable video found on this page. The Pin may contain only an image or is unavailable.';
  if (errStr.includes('no audio stream') || errStr.includes('does not contain audio')) return 'This video does not contain an audio track to extract.';
  if (errStr.includes('http error 429') || errStr.includes('too many requests')) return 'You are being rate limited. Please wait a minute and try again.';
  if (errStr.includes('http error 404') || errStr.includes('not found')) return 'Content not found. Please check the URL is correct.';
  if (errStr.includes('unsupported url')) return 'This URL is not supported. Please use a direct video link.';
  if (errStr.includes('http error 403')) return 'Access denied by the platform. Try again later.';
  if (errStr.includes('is not a valid url')) return 'Invalid URL format. Please paste a valid video link.';
  if (errStr.includes('geo') || errStr.includes('not available in your country')) return 'This content is geo-restricted and not available in your country.';
  if (errStr.includes('age') || errStr.includes('age-restricted')) return 'This content is age-restricted and requires account authentication.';
  if (errStr.includes('network') || errStr.includes('connection') || errStr.includes('timeout')) return 'Network error. Please check your internet connection and try again.';
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
    const ytProcess = spawn('yt-dlp', args, { windowsHide: true });
    
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
        const errorMsg = parseYtdlpError(stderrData);
        return reject(new Error(errorMsg));
      }

      try {
        const info = JSON.parse(stdoutData);
        const formats = normalizeFormats(info.formats, info);

        // Check if there are no video formats found
        const hasVideo = formats.some(f => f.quality !== 'audio');
        if (!hasVideo && (!info.formats || info.formats.length === 0)) {
          if (info.thumbnails && info.thumbnails.length > 0) {
            return reject(new Error('This Pinterest pin contains an image, not a video. Please provide a link to a video Pin.'));
          }
          return reject(new Error('No downloadable video found on this page.'));
        }
        
        const normalizedInfo = {
          id: info.id,
          title: info.title || 'Untitled',
          thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
          duration: info.duration || 0,
          uploader: info.uploader || info.channel || info.creator || 'Unknown',
          platform: info.extractor,
          formats: formats
        };

        resolve(normalizedInfo);
      } catch (err) {
        if (err.message && (err.message.includes('Pinterest pin contains an image') || err.message.includes('No downloadable video'))) {
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
    formatSpec = platform === 'pinterest' 
      ? 'best/bestvideo+bestaudio' 
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
  } else if (platform === 'pinterest') {
    formatSpec = `${formatId}/best`;
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
  const ytProcess = spawn('yt-dlp', args, { windowsHide: true });
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
  const ytProcess = spawn('yt-dlp', args, { windowsHide: true });
  return { stream: ytProcess.stdout, process: ytProcess };
}

module.exports = {
  getVideoInfo,
  downloadStream,
  downloadAudio,
  hasCookiesFile,
  COOKIES_FILE,
  normalizeFormats,
  parseYtdlpError
};
