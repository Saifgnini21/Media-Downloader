/**
 * Tests URL against supported platform regex patterns
 * @param {string} url - The URL to validate
 * @returns {{ valid: boolean, platform: string|null }}
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, platform: null };
  }

  const youtubeRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(youtube\.com|youtu\.be)\/.+$/i;
  const instagramRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(instagram\.com|instagr\.am|ig\.me)\/.+$/i;
  const pinterestRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(pinterest\.(com|[a-z]{2,3}(\.[a-z]{2})?)|pin\.it|pinimg\.com)\/.+$/i;
  const twitterRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(twitter\.com|x\.com)\/.+$/i;
  const facebookRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(facebook\.com|fb\.watch|fb\.gg)\/.+$/i;
  const linkedinRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(linkedin\.com)\/.+$/i;
  const tiktokRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(tiktok\.com)\/.+$/i;
  const snapchatRegex = /^(https?:\/\/)?([a-z0-9-]+\.)?(snapchat\.com)\/.+$/i;

  if (youtubeRegex.test(url)) return { valid: true, platform: 'youtube' };
  if (instagramRegex.test(url)) return { valid: true, platform: 'instagram' };
  if (pinterestRegex.test(url)) return { valid: true, platform: 'pinterest' };
  if (twitterRegex.test(url)) return { valid: true, platform: 'x' };
  if (facebookRegex.test(url)) return { valid: true, platform: 'facebook' };
  if (linkedinRegex.test(url)) return { valid: true, platform: 'linkedin' };
  if (tiktokRegex.test(url)) return { valid: true, platform: 'tiktok' };
  if (snapchatRegex.test(url)) return { valid: true, platform: 'snapchat' };

  return { valid: false, platform: null };
}

/**
 * Strips tracking params and ensures https
 * @param {string} url - The URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeUrl(url) {
  try {
    let sanitized = url.trim();
    if (!/^https?:\/\//i.test(sanitized)) {
      sanitized = 'https://' + sanitized;
    }
    const parsedUrl = new URL(sanitized);
    // Remove common tracking params
    parsedUrl.searchParams.delete('si');
    parsedUrl.searchParams.delete('igshid');
    parsedUrl.searchParams.delete('igsh');
    parsedUrl.searchParams.delete('utm_source');
    parsedUrl.searchParams.delete('utm_medium');
    parsedUrl.searchParams.delete('utm_campaign');
    parsedUrl.searchParams.delete('fbclid');
    parsedUrl.searchParams.delete('t');
    return parsedUrl.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Follows redirects for short links (like pin.it, bit.ly, t.co, instagr.am, ig.me) to retrieve canonical destination URL
 * @param {string} url - Input URL
 * @returns {Promise<string>} Resolved canonical URL
 */
async function resolveRedirectUrl(url) {
  try {
    if (!/pin\.it|t\.co|bit\.ly|tinyurl\.com|instagr\.am|ig\.me|instagram\.com\/share/i.test(url)) {
      return url;
    }
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return response.url || url;
  } catch (err) {
    return url;
  }
}

module.exports = { validateUrl, sanitizeUrl, resolveRedirectUrl };
