const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const apiRoutes = require('./routes/api');
const { getSystemHealth, scheduleAutoUpdate } = require('./utils/systemDiagnostics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup — Configured to support Ad Networks (Monetag, PropellerAds, Adsterra)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      frameSrc: ["'self'", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', apiRoutes);

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`===============================================`);
    console.log(`SaveMedia Server is running on port ${PORT}`);
    const health = await getSystemHealth();
    console.log(`yt-dlp version: ${health.ytdlp.version}`);
    console.log(`ffmpeg: ${health.ffmpeg.installed ? 'Available' : 'Missing'}`);
    console.log(`Cookies configured: ${health.cookies.configured ? 'Yes' : 'No'}`);
    console.log(`Platforms supported: ${health.platformsSupported}`);
    console.log(`===============================================`);

    // Check for updates in the background (runs once every 24h)
    scheduleAutoUpdate();
    setInterval(scheduleAutoUpdate, 24 * 60 * 60 * 1000);
  });
}

module.exports = app;
