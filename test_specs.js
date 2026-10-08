const { validateUrl, sanitizeUrl, resolveRedirectUrl } = require('./utils/validators');
const { getPlatformConfig, getAllPlatforms } = require('./utils/platforms');
const { normalizeFormats, parseYtdlpError, hasCookiesFile, COOKIES_FILE } = require('./utils/ytdlp');

console.log('====================================================');
console.log('          FULL SPECIFICATIONS TEST SUITE            ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    process.exitCode = 1;
  }
}

// 1. Platform Metadata Specification
console.log('[SPEC 1] Platform Configurations & Metadata:');
const expectedPlatforms = ['youtube', 'instagram', 'pinterest', 'x', 'facebook', 'linkedin', 'tiktok', 'snapchat'];
const allPlatforms = getAllPlatforms();
assert(Object.keys(allPlatforms).length === 8, '8 platforms registered in platforms.js');

for (const p of expectedPlatforms) {
  const cfg = getPlatformConfig(p);
  assert(cfg !== null, `Config exists for ${p}`);
  assert(Array.isArray(cfg.qualities) && cfg.qualities.length > 0, `${p} has quality presets`);
  assert(Array.isArray(cfg.supportedFormats) && cfg.supportedFormats.length > 0, `${p} has supported formats`);
}

// 2. URL Validation Specification (all 8 platforms + mobile + short links + invalid)
console.log('\n[SPEC 2] URL Validation & Platform Detection:');
const validationCases = [
  // YouTube
  ['https://www.youtube.com/watch?v=jNQXAC9IVRw', 'youtube', 'YouTube desktop watch URL'],
  ['https://youtu.be/jNQXAC9IVRw', 'youtube', 'YouTube short youtu.be link'],
  ['https://m.youtube.com/watch?v=jNQXAC9IVRw', 'youtube', 'YouTube mobile m.youtube link'],
  ['https://www.youtube.com/shorts/3jZ_Xq4yW0c', 'youtube', 'YouTube Shorts link'],
  ['https://music.youtube.com/watch?v=123', 'youtube', 'YouTube Music link'],

  // Instagram
  ['https://www.instagram.com/reel/C3abc123/', 'instagram', 'Instagram reel link'],
  ['https://instagram.com/p/C3abc123/', 'instagram', 'Instagram post link'],
  ['https://m.instagram.com/p/C3abc123/', 'instagram', 'Instagram mobile link'],
  ['https://instagr.am/p/DRVBXWtDtJb/', 'instagram', 'Instagram instagr.am link'],
  ['https://ig.me/v/DRVBXWtDtJb', 'instagram', 'Instagram ig.me short link'],

  // Pinterest
  ['https://www.pinterest.com/pin/1084663891475263837/', 'pinterest', 'Pinterest desktop pin link'],
  ['https://pinterest.com/pin/1084663891475263837/', 'pinterest', 'Pinterest link without www'],
  ['https://fr.pinterest.com/pin/1084663891475263837/', 'pinterest', 'Pinterest country subdomain'],
  ['https://www.pinterest.co.uk/pin/1084663891475263837/', 'pinterest', 'Pinterest international TLD (.co.uk)'],
  ['https://pin.it/abc1234', 'pinterest', 'Pinterest mobile pin.it link'],

  // X / Twitter
  ['https://twitter.com/user/status/1234567890', 'x', 'Twitter standard status link'],
  ['https://x.com/user/status/1234567890', 'x', 'X.com status link'],
  ['https://mobile.twitter.com/user/status/123', 'x', 'Twitter mobile link'],

  // Facebook
  ['https://www.facebook.com/watch/?v=123456789', 'facebook', 'Facebook watch link'],
  ['https://fb.watch/abc1234/', 'facebook', 'Facebook short fb.watch link'],
  ['https://m.facebook.com/story.php?story_fbid=123', 'facebook', 'Facebook mobile link'],

  // LinkedIn
  ['https://www.linkedin.com/posts/activity-123456', 'linkedin', 'LinkedIn post link'],
  ['https://fr.linkedin.com/posts/activity-123456', 'linkedin', 'LinkedIn country subdomain'],

  // TikTok
  ['https://www.tiktok.com/@user/video/1234567890', 'tiktok', 'TikTok standard video link'],
  ['https://vm.tiktok.com/ZMe123456/', 'tiktok', 'TikTok vm.tiktok short link'],
  ['https://m.tiktok.com/v/123.html', 'tiktok', 'TikTok mobile link'],

  // Snapchat
  ['https://www.snapchat.com/spotlight/123456', 'snapchat', 'Snapchat spotlight link'],
  ['https://story.snapchat.com/s/123456', 'snapchat', 'Snapchat story link'],

  // Invalids
  ['https://example.com/video', null, 'Generic invalid URL rejected'],
  ['https://google.com/search?q=video', null, 'Search engine URL rejected'],
  ['', null, 'Empty string rejected'],
  [null, null, 'Null rejected']
];

for (const [url, expectedPlatform, desc] of validationCases) {
  const res = validateUrl(url);
  assert(res.platform === expectedPlatform, `${desc}: ${url || 'null'} => ${expectedPlatform}`);
}

// 3. Sanitization & Short Link Resolution
console.log('\n[SPEC 3] URL Sanitization:');
const trackingUrl = 'https://www.instagram.com/reel/abc1234?igsh=secret_tracking&si=secret_tracker&utm_source=fb&utm_medium=cpc&fbclid=12345';
const sanitized = sanitizeUrl(trackingUrl);
assert(!sanitized.includes('si='), 'Strips YouTube si parameter');
assert(!sanitized.includes('igsh='), 'Strips Instagram igsh parameter');
assert(!sanitized.includes('utm_source='), 'Strips utm_source');
assert(!sanitized.includes('fbclid='), 'Strips fbclid');
assert(sanitized.startsWith('https://'), 'Ensures HTTPS protocol');

// 4. Format Normalization
console.log('\n[SPEC 4] Format Normalization & Audio Prioritization:');
const ytFormats = [
  { format_id: '18', height: 360, ext: 'mp4', acodec: 'mp4a.40.2', vcodec: 'avc1.42001E', filesize: 5000000 },
  { format_id: '22', height: 720, ext: 'mp4', acodec: 'mp4a.40.2', vcodec: 'avc1.64001F', filesize: 15000000 },
  { format_id: '137', height: 1080, ext: 'mp4', acodec: 'none', vcodec: 'avc1.640028', filesize: 30000000 },
  { format_id: '140', height: null, ext: 'm4a', acodec: 'mp4a.40.2', vcodec: 'none', filesize: 2000000 }
];
const normYt = normalizeFormats(ytFormats);
assert(normYt.some(f => f.quality === '360p'), 'Normalizes 360p');
assert(normYt.some(f => f.quality === '720p'), 'Normalizes 720p');
assert(normYt.some(f => f.quality === '1080p'), 'Normalizes 1080p');
assert(normYt.some(f => f.quality === 'audio' && f.ext === 'mp3'), 'Adds MP3 audio option');

// Fallback format sorting for vertical/single stream
const vertFormats = [
  { format_id: 'silent_large', height: 1138, ext: 'mp4', acodec: 'none', vcodec: 'avc' },
  { format_id: 'audio_medium', height: 1136, ext: 'mp4', acodec: 'mp4a', vcodec: 'avc' }
];
const normVert = normalizeFormats(vertFormats);
assert(normVert[0].hasAudio === true, 'Prioritizes audio-containing format over silent format');
assert(normVert.some(f => f.label.includes('(No Audio)')), 'Labels silent streams with (No Audio)');

// 5. Error Parsing Specification
console.log('\n[SPEC 5] Error Parsing & Human-Readable Messages:');
const errorChecks = [
  ['Private video: sign in', 'This video is private.'],
  ['This video is not available in your region', 'This video is unavailable in your region or has been removed.'],
  ['Sign in to confirm you are not a bot', 'This content requires authentication. Please set up cookies.'],
  ['HTTP Error 429: Too Many Requests', 'You are being rate limited. Please wait a minute and try again.'],
  ['HTTP Error 404: Not Found', 'Content not found. Please check the URL is correct.'],
  ['No video formats found', 'No downloadable video found on this page. The Pin may contain only an image or is unavailable.'],
  ['has no audio stream', 'This video does not contain an audio track to extract.']
];
for (const [raw, expected] of errorChecks) {
  const result = parseYtdlpError(raw);
  assert(result === expected, `Parses "${raw.substring(0, 30)}..." => "${expected.substring(0, 35)}..."`);
}

// 6. Cookies status
console.log('\n[SPEC 6] Cookies Configuration:');
assert(typeof COOKIES_FILE === 'string' && COOKIES_FILE.endsWith('cookies.txt'), 'Cookies path configured');
assert(typeof hasCookiesFile() === 'boolean', 'Cookies existence check returns boolean');

console.log('\n====================================================');
console.log(`TOTAL SPECS TESTED: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================');
