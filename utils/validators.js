/**
 * Tests URL against supported platform regex patterns
 * @param {string} url - The URL to validate
 * @returns {{ valid: boolean, platform: string|null }}
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, platform: null };
  }

  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i;
  // Accept any instagram.com URL (reels, posts, stories, tv, profile clips etc.)
  const instagramRegex = /^(https?:\/\/)?(www\.)?(instagram\.com)\/.+$/i;
  const pinterestRegex = /^(https?:\/\/)?(pin\.it|([a-z]{2}\.)?pinterest\.com\/pin)\/.+$/i;
  const twitterRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+$/i;
  const facebookRegex = /^(https?:\/\/)?(www\.|web\.|m\.)?(facebook\.com|fb\.watch|fb\.gg)\/.+$/i;
  const linkedinRegex = /^(https?:\/\/)?([a-z]{2,3}\.)?(linkedin\.com)\/.+$/i;
  // TikTok: www, vm, vt subdomains or no subdomain
  const tiktokRegex = /^(https?:\/\/)?(www\.|vm\.|vt\.)?(tiktok\.com)\/.+$/i;
  const snapchatRegex = /^(https?:\/\/)?(www\.|story\.|t\.)?(snapchat\.com)\/.+$/i;

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

module.exports = { validateUrl, sanitizeUrl };
