FROM node:20-bullseye-slim

# Install system dependencies: ffmpeg, python3, ca-certificates, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Download and verify standalone Linux yt-dlp binary during container build
COPY scripts/ ./scripts/
RUN node scripts/ensure-ytdlp.js

# Copy remaining source code
COPY . .

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start SaveMedia Downloader server
CMD ["node", "server.js"]
