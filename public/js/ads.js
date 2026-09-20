/**
 * SaveMedia — Premium UI/UX Ad Network Manager
 * Monetization system designed for Monetag, PropellerAds, and Adsterra
 */

const AD_CONFIG = {
    // Master switch
    enabled: true,

    // Test Mode: Set to true to test popunder triggering with visual toasts
    testMode: true,

    // Provider name (for analytics / logging)
    provider: 'Monetag / PropellerAds / Adsterra',

    // 1. Popunder / Smartlink On-Click Settings
    popunder: {
        enabled: true,
        frequencyCapMinutes: 0, // Set to 0 during testing so every click triggers
        smartlinkUrl: '',       // Direct Smartlink URL (e.g., Monetag / Adsterra Smartlink)
        scriptUrl: ''          // Or Network Popunder script URL
    },

    // 2. Native In-Feed Banner (Below preview card: #ad-slot-native)
    nativeBanner: {
        enabled: true,
        scriptUrl: ''
    },

    // 3. Inline Download Sponsor Bar (Inside preview card: #ad-slot-card-inline)
    cardInline: {
        enabled: true,
        scriptUrl: ''
    },

    // 4. Sticky Floating Bottom Ad Bar (#ad-sticky-bar)
    stickyBottom: {
        enabled: true,
        scriptUrl: ''
    }
};

/**
 * Trigger popunder ad on Download click with frequency capping and UX feedback
 */
function triggerAdPopunder() {
    if (!AD_CONFIG.enabled || !AD_CONFIG.popunder.enabled) return;

    const lastTrigger = sessionStorage.getItem('savemedia_popunder_time');
    const now = Date.now();
    const capMs = AD_CONFIG.popunder.frequencyCapMinutes * 60 * 1000;

    if (AD_CONFIG.popunder.frequencyCapMinutes > 0 && lastTrigger && (now - parseInt(lastTrigger, 10)) < capMs) {
        console.log('📢 Ad Manager: Popunder skipped due to frequency cap.');
        return;
    }

    sessionStorage.setItem('savemedia_popunder_time', now.toString());

    if (AD_CONFIG.testMode) {
        console.log('🎯 Ad Manager [TEST MODE]: Popunder / Smartlink triggered on Download click!');
        if (typeof showToast === 'function') {
            showToast('💰 [PUB TEST] Popunder déclenché avec succès !', 'warning');
        }
    }

    if (AD_CONFIG.popunder.smartlinkUrl) {
        try {
            const adWin = window.open(AD_CONFIG.popunder.smartlinkUrl, '_blank');
            if (adWin) {
                adWin.blur();
                window.focus();
            }
        } catch (e) {
            console.warn('Popunder blocked by browser:', e);
        }
    }

    if (window.monetagTrigger && typeof window.monetagTrigger === 'function') {
        window.monetagTrigger();
    }
}

/**
 * Initialize all Ad Slots with perfect UI/UX containers
 */
function initAdSlots() {
    if (!AD_CONFIG.enabled) return;

    // 1. Native In-Feed Slot
    const nativeSlot = document.getElementById('ad-slot-native');
    if (nativeSlot) {
        if (AD_CONFIG.nativeBanner.scriptUrl) {
            injectScript(nativeSlot, AD_CONFIG.nativeBanner.scriptUrl);
        } else {
            renderNativePlaceholder(nativeSlot);
        }
    }

    // 2. Inline Preview Card Slot
    const inlineSlot = document.getElementById('ad-slot-card-inline');
    if (inlineSlot) {
        if (AD_CONFIG.cardInline.scriptUrl) {
            injectScript(inlineSlot, AD_CONFIG.cardInline.scriptUrl);
        } else {
            renderInlinePlaceholder(inlineSlot);
        }
    }

    // 3. Floating Bottom Sticky Bar
    const stickySlot = document.getElementById('ad-sticky-bar');
    if (stickySlot && !sessionStorage.getItem('savemedia_sticky_closed')) {
        if (AD_CONFIG.stickyBottom.scriptUrl) {
            injectScript(stickySlot, AD_CONFIG.stickyBottom.scriptUrl);
            stickySlot.classList.remove('hidden');
        } else {
            renderStickyPlaceholder(stickySlot);
        }
    }
}

/**
 * Script Injector with anti-CLS protection
 */
function injectScript(container, url) {
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    container.appendChild(script);
}

/**
 * UI/UX Placeholder: Native In-Feed Card
 */
function renderNativePlaceholder(container) {
    container.className = "w-full mt-6 p-4 rounded-2xl glass border border-white/10 relative overflow-hidden transition-all hover:border-brand-purple/30 group";
    container.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-brand-purple/20 text-brand-purple border border-brand-purple/30">Sponsored</span>
                <span class="text-xs text-slate-400 font-medium">Featured Content</span>
            </div>
            <span class="text-[10px] text-slate-600 font-mono">AD SLOT #1</span>
        </div>
        <div class="flex items-center justify-between gap-4 py-2 px-3 rounded-xl bg-white/5 border border-white/5">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 flex items-center justify-center text-brand-cyan text-lg">⚡</div>
                <div>
                    <div class="text-sm font-semibold text-white">Monetag & Adsterra Ready</div>
                    <div class="text-xs text-slate-400">High CPM in-page push and native banner container</div>
                </div>
            </div>
            <span class="hidden sm:inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/10 group-hover:bg-brand-purple/20 transition-colors">
                Learn More
            </span>
        </div>
    `;
}

/**
 * UI/UX Placeholder: Card Inline Sponsor Bar
 */
function renderInlinePlaceholder(container) {
    container.className = "w-full my-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs";
    container.innerHTML = `
        <div class="flex items-center gap-2 text-slate-300">
            <span class="text-brand-cyan font-bold">✨ Partner:</span>
            <span>Fast direct video download server active</span>
        </div>
        <span class="text-[10px] text-slate-500 uppercase font-mono">Ad</span>
    `;
}

/**
 * UI/UX Placeholder: Floating Bottom Sticky Ad Bar
 */
function renderStickyPlaceholder(container) {
    container.className = "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl p-3 rounded-2xl glass border border-white/15 shadow-2xl flex items-center justify-between gap-3 fade-in";
    container.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan font-bold text-xs">Ad</div>
            <div class="text-xs text-slate-300">
                <span class="font-semibold text-white">Support SaveMedia:</span> Ad network script container (728x90 / Banner)
            </div>
        </div>
        <button onclick="closeStickyAd()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Dismiss">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;
    container.classList.remove('hidden');
}

/**
 * Close sticky ad bar and save dismissal choice in session
 */
function closeStickyAd() {
    const stickySlot = document.getElementById('ad-sticky-bar');
    if (stickySlot) stickySlot.classList.add('hidden');
    sessionStorage.setItem('savemedia_sticky_closed', 'true');
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAdSlots);
