const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { validateUrl, sanitizeUrl } = require('../utils/validators');
const { getPlatformConfig } = require('../utils/platforms');
const { getVideoInfo, downloadStream, downloadAudio, hasCookiesFile, COOKIES_FILE } = require('../utils/ytdlp');

const router = express.Router();

// Rate limiter: 10 requests per minute per IP for fetch-info
const fetchInfoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// Rate limiter: 5 requests per minute per IP for download
const downloadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many downloads, please try again later.' }
});

// GET /api/cookies-status — Check if cookies file is configured
router.get('/cookies-status', (req, res) => {
  res.json({
    success: true,
    hasCookies: hasCookiesFile(),
    cookiesPath: COOKIES_FILE
  });
});

// POST /api/fetch-info
router.post('/fetch-info', fetchInfoLimiter, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const { valid, platform } = validateUrl(url);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Invalid or unsupported URL. Please paste a valid YouTube, Instagram, or Pinterest link.' });
    }

    const sanitizedUrl = sanitizeUrl(url);
    
    // Pass the detected platform so yt-dlp can use appropriate auth
    const videoInfo = await getVideoInfo(sanitizedUrl, platform);
    const platformConfig = getPlatformConfig(platform);

    return res.json({
      success: true,
      data: {
        ...videoInfo,
        detectedPlatform: platform,
        platform: platformConfig
      }
    });

  } catch (error) {
    console.error('Fetch info error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/download
router.get('/download', downloadLimiter, (req, res) => {
  try {
    const { url, formatId, title = 'download' } = req.query;

    if (!url || !formatId) {
      return res.status(400).json({ success: false, error: 'URL and formatId are required' });
    }

    const { valid, platform } = validateUrl(url);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Invalid or unsupported URL' });
    }

    const sanitizedUrl = sanitizeUrl(url);
    
    // Sanitize title for filename
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 200);

    let downloadTask;
    let contentType;
    let ext;

    if (formatId === 'audio' || formatId === 'mp3' || formatId === 'bestaudio') {
      downloadTask = downloadAudio(sanitizedUrl, platform);
      contentType = 'audio/mpeg';
      ext = 'mp3';
    } else {
      downloadTask = downloadStream(sanitizedUrl, formatId, platform);
      contentType = 'video/mp4';
      ext = 'mp4';
    }

    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}.${ext}"`);
    res.setHeader('Content-Type', contentType);

    // Pipe the stdout stream to response
    downloadTask.stream.pipe(res);

    downloadTask.process.stderr.on('data', (data) => {
      console.error(`yt-dlp download error: ${data.toString()}`);
    });

    downloadTask.process.on('close', (code) => {
      if (code !== 0) {
        console.error(`yt-dlp process exited with code ${code}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'Download failed. The content may require authentication.' });
        } else {
          res.destroy(new Error('Download failed mid-stream'));
        }
      }
    });

    // Handle client disconnect — kill yt-dlp process
    req.on('close', () => {
      if (downloadTask.process && !downloadTask.process.killed) {
        downloadTask.process.kill();
      }
    });

  } catch (error) {
    console.error('Download error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    } else {
      res.destroy(error);
    }
  }
});

module.exports = router;
