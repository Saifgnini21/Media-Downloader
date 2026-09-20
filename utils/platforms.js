const PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: '📺',
    color: '#FF0000',
    qualities: ['360p', '720p', '1080p', 'mp3'],
    supportedFormats: ['mp4', 'webm', 'mp3']
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    qualities: ['720p', '1080p', 'mp3'],
    supportedFormats: ['mp4']
  },
  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    color: '#E60023',
    qualities: ['720p', '1080p', 'mp3'],
    supportedFormats: ['mp4']
  },
  x: {
    name: 'X / Twitter',
    icon: '𝕏',
    color: '#1DA1F2',
    qualities: ['720p', '1080p', 'mp3'],
    supportedFormats: ['mp4']
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    qualities: ['720p', '1080p', 'mp3'],
    supportedFormats: ['mp4']
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    qualities: ['720p', '1080p', 'mp3'],
    supportedFormats: ['mp4']
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#FE2C55',
    qualities: ['720p', '1080p', 'mp3'],
    supportedFormats: ['mp4']
  },
  snapchat: {
    name: 'Snapchat',
    icon: '👻',
    color: '#FFFC00',
    qualities: ['720p', '1080p', 'mp3'],
    supportedFormats: ['mp4']
  }
};

/**
 * Get platform configuration by name
 * @param {string} platformName - The name of the platform
 * @returns {object|null} Platform configuration object or null if not found
 */
function getPlatformConfig(platformName) {
  return PLATFORMS[platformName] || null;
}

/**
 * Get all available platforms
 * @returns {object} Object containing all platforms
 */
function getAllPlatforms() {
  return PLATFORMS;
}

module.exports = {
  PLATFORMS,
  getPlatformConfig,
  getAllPlatforms
};
