/**
 * SaveMedia - Main Application Logic
 */

// State Management
const state = {
    currentUrl: '',
    platform: null,
    videoInfo: null,
    selectedFormat: null,
    isLoading: false,
    isDownloading: false
};

// DOM Elements
const elements = {
    urlInput: document.getElementById('url-input'),
    clearBtn: document.getElementById('clear-btn'),
    fetchBtn: document.getElementById('fetch-btn'),
    fetchText: document.getElementById('fetch-text'),
    fetchSpinner: document.getElementById('fetch-spinner'),
    
    platformBadge: document.getElementById('platform-badge'),
    platformBadgeIcon: document.getElementById('platform-badge-icon'),
    platformBadgeName: document.getElementById('platform-badge-name'),
    
    previewContainer: document.getElementById('preview-card-container'),
    thumbnail: document.getElementById('video-thumbnail'),
    duration: document.getElementById('video-duration'),
    title: document.getElementById('video-title'),
    uploader: document.getElementById('video-uploader'),
    platformPill: document.getElementById('video-platform-pill'),
    qualitySelector: document.getElementById('quality-selector'),
    
    downloadBtn: document.getElementById('download-btn'),
    downloadText: document.getElementById('download-text'),
    downloadIcon: document.getElementById('download-icon'),
    downloadProgress: document.getElementById('download-progress'),
    
    toastContainer: document.getElementById('toast-container'),
    platformCycleText: document.getElementById('platform-cycle-text'),
    instagramHelp: document.getElementById('instagram-help'),
    cookiesStatus: document.getElementById('cookies-status')
};

// Constants
const PLATFORMS = {
    YOUTUBE: { name: 'YouTube', color: '#FF0000', class: 'youtube-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29.01 29.01 0 0 0 1 11.75a29.01 29.01 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29.01 29.01 0 0 0 .46-5.33 29.01 29.01 0 0 0-.46-5.33zM9.75 15.02V8.48L15.5 11.75l-5.75 3.27z"/></svg>' },
    INSTAGRAM: { name: 'Instagram', color: '#E1306C', class: 'instagram-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>' },
    PINTEREST: { name: 'Pinterest', color: '#E60023', class: 'pinterest-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.168 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/></svg>' },
    X: { name: 'X / Twitter', color: '#1DA1F2', class: 'x-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    FACEBOOK: { name: 'Facebook', color: '#1877F2', class: 'facebook-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
    LINKEDIN: { name: 'LinkedIn', color: '#0A66C2', class: 'linkedin-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.239-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>' },
    TIKTOK: { name: 'TikTok', color: '#FE2C55', class: 'tiktok-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3.05 15.7a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.06z"/></svg>' },
    SNAPCHAT: { name: 'Snapchat', color: '#FFFC00', class: 'snapchat-color', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.035 1.5c-4.148 0-6.735 2.845-6.735 5.795 0 1.258.468 2.368 1.157 3.197.106.126.155.281.127.439-.06.332-.234.994-.523 1.343-.223.271-.478.344-.738.344-.225 0-.46-.057-.694-.176-.328-.168-.781-.307-1.122.02-.279.268-.13.785.203 1.051 1.096.877 2.148.889 2.651.889.308 0 .614-.047.886-.142.348-.12.571.189.479.489-.317 1.034-.582 2.385.666 3.109 1.11.644 2.457.885 3.694.885 1.236 0 2.584-.241 3.694-.885 1.248-.724.983-2.075.666-3.109-.092-.3.131-.609.479-.489.272.095.578.142.886.142.503 0 1.555-.012 2.651-.889.333-.266.482-.783.203-1.051-.341-.327-.794-.188-1.122-.02-.234.119-.469.176-.694.176-.26 0-.515-.073-.738-.344-.289-.349-.463-1.011-.523-1.343-.028-.158.021-.313.127-.439.689-.829 1.157-1.939 1.157-3.197 0-2.95-2.587-5.795-6.735-5.795z"/></svg>' }
};

// --- Utilities ---

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
}

function sanitizeFilename(title) {
    return title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// --- Platform Detection ---

function detectPlatform(url) {
    if (!url) return null;
    
    if (/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/i.test(url)) return 'YOUTUBE';
    if (/(?:https?:\/\/)?(?:www\.)?instagram\.com/i.test(url)) return 'INSTAGRAM';
    if (/(?:https?:\/\/)?(?:www\.)?(?:pinterest\.com|pin\.it)/i.test(url)) return 'PINTEREST';
    if (/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)/i.test(url)) return 'X';
    if (/(?:https?:\/\/)?(?:www\.|web\.|m\.)?(?:facebook\.com|fb\.watch|fb\.gg)/i.test(url)) return 'FACEBOOK';
    if (/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com/i.test(url)) return 'LINKEDIN';
    if (/(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com/i.test(url)) return 'TIKTOK';
    if (/(?:https?:\/\/)?(?:www\.|story\.|t\.)?snapchat\.com/i.test(url)) return 'SNAPCHAT';
    
    return null;
}

// --- URL & Input Processing ---

function processUrl(rawUrl, autoFetch = false) {
    const url = (rawUrl || '').trim();
    state.currentUrl = url;
    
    // Toggle Clear button visibility
    if (elements.clearBtn) {
        if (url.length > 0) {
            elements.clearBtn.classList.remove('hidden');
        } else {
            elements.clearBtn.classList.add('hidden');
        }
    }

    if (!url) {
        elements.platformBadge.classList.add('hidden');
        elements.platformBadge.classList.remove('flex');
        elements.fetchBtn.disabled = true;
        state.platform = null;
        if (elements.instagramHelp) elements.instagramHelp.classList.add('hidden');
        return;
    }

    const platformKey = detectPlatform(url);
    if (platformKey) {
        state.platform = platformKey;
        const p = PLATFORMS[platformKey];
        elements.platformBadgeIcon.innerHTML = p.icon;
        elements.platformBadgeName.textContent = p.name;
        elements.platformBadge.classList.remove('hidden');
        elements.platformBadge.classList.add('flex');
        elements.platformBadge.style.color = p.color;
        elements.fetchBtn.disabled = false;
        
        // Never auto-show Instagram help on URL detection
        // It will appear only if an auth error occurs during fetch
        if (elements.instagramHelp) {
            elements.instagramHelp.classList.add('hidden');
        }

        // Trigger auto fetch if requested and valid
        if (autoFetch && !state.isLoading) {
            fetchVideoInfo();
        }
    } else {
        elements.platformBadge.classList.add('hidden');
        elements.platformBadge.classList.remove('flex');
        elements.fetchBtn.disabled = true;
        state.platform = null;
        if (elements.instagramHelp) {
            elements.instagramHelp.classList.add('hidden');
        }
    }
}

const handleInput = debounce((e) => {
    processUrl(e.target.value, false);
}, 200);

elements.urlInput.addEventListener('input', handleInput);

// --- Clear Button Handler ---
if (elements.clearBtn) {
    elements.clearBtn.addEventListener('click', () => {
        elements.urlInput.value = '';
        state.currentUrl = '';
        state.platform = null;
        state.videoInfo = null;
        
        elements.clearBtn.classList.add('hidden');
        elements.platformBadge.classList.add('hidden');
        elements.platformBadge.classList.remove('flex');
        elements.previewContainer.classList.add('hidden');
        if (elements.instagramHelp) elements.instagramHelp.classList.add('hidden');
        elements.fetchBtn.disabled = true;
        elements.urlInput.focus();
    });
}

// --- Paste Handling ---
elements.urlInput.addEventListener('paste', (e) => {
    // Read pasted text directly or via clipboard data
    const pastedText = (e.clipboardData || window.clipboardData)?.getData('text');
    if (pastedText) {
        setTimeout(() => {
            elements.urlInput.value = pastedText;
            processUrl(pastedText, true);
        }, 10);
    } else {
        setTimeout(() => {
            processUrl(elements.urlInput.value, true);
        }, 50);
    }
});

// --- Fetch Logic ---

elements.fetchBtn.addEventListener('click', fetchVideoInfo);

async function fetchVideoInfo() {
    if (!state.currentUrl || !state.platform) return;
    
    setLoadingState(true);
    elements.previewContainer.classList.add('hidden');
    
    try {
        const response = await fetch('/api/fetch-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: state.currentUrl })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to fetch video information.');
        }
        
        // Normalize the API response to match our rendering expectations
        const data = result.data;
        state.videoInfo = {
            title: data.title,
            uploader: data.uploader || 'Unknown',
            thumbnail: data.thumbnail,
            duration: data.duration,
            formats: (data.formats || []).map(f => ({
                id: f.formatId,
                label: f.label || f.quality,
                type: f.quality === 'audio' ? 'audio' : 'video',
                size: f.filesize
            }))
        };
        
        renderPreviewCard(state.videoInfo);
        showToast('Video information fetched successfully!', 'success');
        // Hide Instagram help if fetch succeeded
        if (elements.instagramHelp) elements.instagramHelp.classList.add('hidden');
        
    } catch (error) {
        const errMsg = error.message || 'Failed to fetch video information.';
        showToast(errMsg, 'error');
        // Show Instagram auth help only if the error is auth-related and platform is Instagram
        if (state.platform === 'INSTAGRAM' && elements.instagramHelp &&
            (errMsg.toLowerCase().includes('auth') || errMsg.toLowerCase().includes('cookies') || errMsg.toLowerCase().includes('login') || errMsg.toLowerCase().includes('sign in'))) {
            elements.instagramHelp.classList.remove('hidden');
            checkCookiesStatus();
        }
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    state.isLoading = isLoading;
    elements.fetchBtn.disabled = isLoading;
    elements.urlInput.disabled = isLoading;
    
    if (isLoading) {
        elements.fetchText.textContent = 'Fetching...';
        elements.fetchSpinner.classList.remove('hidden');
    } else {
        elements.fetchText.textContent = 'Fetch Video';
        elements.fetchSpinner.classList.add('hidden');
    }
}

// --- Render Logic ---

function renderPreviewCard(data) {
    elements.thumbnail.src = data.thumbnail;
    elements.duration.textContent = formatDuration(data.duration);
    elements.title.textContent = data.title;
    elements.uploader.textContent = data.uploader;
    
    const p = PLATFORMS[state.platform];
    elements.platformPill.innerHTML = `${p.icon} ${p.name}`;
    elements.platformPill.style.backgroundColor = `${p.color}33`; // 20% opacity
    elements.platformPill.style.color = p.color;
    
    // Render Quality Selector
    elements.qualitySelector.innerHTML = '';
    data.formats.forEach((fmt, index) => {
        const pill = document.createElement('button');
        pill.className = `quality-pill ${index === 0 ? 'active' : ''}`;
        
        let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z"></path><rect x="3" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>';
        if (fmt.type === 'audio') {
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
        }
        
        pill.innerHTML = `${icon} ${fmt.label} ${fmt.size ? `<span class="opacity-70 text-xs ml-1">(${formatFileSize(fmt.size)})</span>` : ''}`;
        
        pill.addEventListener('click', () => {
            document.querySelectorAll('.quality-pill').forEach(el => el.classList.remove('active'));
            pill.classList.add('active');
            state.selectedFormat = fmt;
        });
        
        elements.qualitySelector.appendChild(pill);
    });
    
    state.selectedFormat = data.formats[0]; // default select first
    
    elements.previewContainer.classList.remove('hidden');
    // Scroll slightly down to show card
    elements.previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// --- Download Logic ---

elements.downloadBtn.addEventListener('click', async () => {
    if (state.isDownloading || !state.selectedFormat) return;
    
    // Trigger ad network popunder / smartlink
    if (typeof triggerAdPopunder === 'function') {
        triggerAdPopunder();
    }
    
    state.isDownloading = true;
    elements.downloadText.textContent = 'Preparing...';
    elements.downloadIcon.classList.add('hidden');
    elements.downloadProgress.style.width = '30%';
    
    try {
        const title = state.videoInfo ? sanitizeFilename(state.videoInfo.title) : 'download';
        const formatId = state.selectedFormat.id;
        const downloadUrl = `/api/download?url=${encodeURIComponent(state.currentUrl)}&formatId=${encodeURIComponent(formatId)}&title=${encodeURIComponent(title)}`;
        
        elements.downloadText.textContent = 'Downloading...';
        elements.downloadProgress.style.width = '100%';
        
        // Trigger browser download via hidden link
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showToast('Download started! Check your browser downloads.', 'success');
        
        setTimeout(() => resetDownloadButton(), 2000);
        
    } catch (error) {
        showToast('Download failed. Please try again.', 'error');
        resetDownloadButton();
    }
});

function resetDownloadButton() {
    state.isDownloading = false;
    elements.downloadText.textContent = 'Download';
    elements.downloadIcon.classList.remove('hidden');
    elements.downloadProgress.style.width = '0%';
}

// --- UI Extras ---

// Platform Text Cycle in Hero
const cycleTexts = [
    { text: 'YouTube', class: 'youtube-color' },
    { text: 'Instagram', class: 'instagram-color' },
    { text: 'Pinterest', class: 'pinterest-color' },
    { text: 'X / Twitter', class: 'x-color' },
    { text: 'Facebook', class: 'facebook-color' },
    { text: 'LinkedIn', class: 'linkedin-color' },
    { text: 'TikTok', class: 'tiktok-color' },
    { text: 'Snapchat', class: 'snapchat-color' }
];
let cycleIndex = 0;

setInterval(() => {
    elements.platformCycleText.style.opacity = 0;
    
    setTimeout(() => {
        cycleIndex = (cycleIndex + 1) % cycleTexts.length;
        const current = cycleTexts[cycleIndex];
        
        elements.platformCycleText.textContent = current.text;
        elements.platformCycleText.className = `inline-block min-w-[220px] text-left platform-cycle ${current.class}`;
        elements.platformCycleText.style.opacity = 1;
    }, 300);
}, 3000);

// Toast System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent-green"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    else if (type === 'error') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-youtube-red"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    else icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    
    toast.innerHTML = `
        ${icon}
        <span class="text-sm font-medium flex-grow">${message}</span>
        <button class="text-slate-400 hover:text-white" onclick="this.parentElement.classList.add('closing'); setTimeout(() => this.parentElement.remove(), 300)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('closing');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// --- Keyboard Support ---

// Allow pressing Enter in the URL input to trigger fetch
elements.urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !elements.fetchBtn.disabled) {
        e.preventDefault();
        fetchVideoInfo();
    }
});

// --- Cookies Status Check ---

async function checkCookiesStatus() {
    if (!elements.cookiesStatus) return;
    try {
        const res = await fetch('/api/cookies-status');
        const data = await res.json();
        if (data.hasCookies) {
            elements.cookiesStatus.innerHTML = `<span class="text-emerald-400">✓ cookies.txt detected! Instagram downloads active.</span>`;
        } else {
            elements.cookiesStatus.innerHTML = `<span class="text-amber-400">⚠️ No cookies.txt found at project root.</span>`;
        }
    } catch (e) {
        elements.cookiesStatus.innerHTML = '';
    }
}

// --- Initial State ---

// Ensure fetch button is disabled on page load (no URL yet)
elements.fetchBtn.disabled = true;

