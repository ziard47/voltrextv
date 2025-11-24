// Global State
let searchChannels = [];
let hls;

// DOM Elements (Shared)
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const searchBtn = document.getElementById('searchBtn');
const searchOverlay = document.getElementById('searchOverlay');
const closeSearch = document.getElementById('closeSearch');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// DOM Elements (Home Page Specific)
const videoPlayer = document.getElementById('videoPlayer');
const playerPlaceholder = document.getElementById('playerPlaceholder');
const currentChannelName = document.getElementById('currentChannelName');
const channelGridEl = document.getElementById('channelGrid');
const channelCountEl = document.getElementById('channelCount');

document.addEventListener('DOMContentLoaded', () => {
    initSharedUI();

    // Only init home page logic if player exists
    if (videoPlayer) {
        init();
    } else {
        // Fetch channels for search on other pages
        fetchChannelsForSearch();
    }
});

function initSharedUI() {
    // Mobile Menu
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('mobile-active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Search Overlay
    if (searchBtn && searchOverlay) {
        searchBtn.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            searchInput.focus();
        });

        closeSearch.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
        });

        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') searchOverlay.classList.remove('active');
        });
    }
}

async function fetchChannelsForSearch() {
    if (searchChannels.length > 0) return;
    try {
        const response = await fetch('https://iptv-org.github.io/iptv/index.m3u');
        const text = await response.text();
        searchChannels = parseM3U(text);
    } catch (e) {
        console.error("Failed to fetch for search", e);
    }
}

async function init() {
    // Handle URL params
    const urlParams = new URLSearchParams(window.location.search);
    const playUrl = urlParams.get('play');
    const playName = urlParams.get('name');

    if (playUrl) {
        loadChannel(playUrl, playName || 'Unknown');
    }

    // Fetch and Render Featured Channels
    try {
        const response = await fetch('https://iptv-org.github.io/iptv/countries/lk.m3u');
        const text = await response.text();
        const featuredChannels = parseM3U(text);

        if (channelCountEl) channelCountEl.textContent = featuredChannels.length;

        // Render all Sri Lankan channels on home
        renderChannels(featuredChannels);

    } catch (error) {
        console.error('Error:', error);
        if (channelGridEl) channelGridEl.innerHTML = '<div class="loading-text" style="color:red">SYSTEM ERROR</div>';
    }

    // Fetch Global Channels for Search
    fetchChannelsForSearch();
}

function parseM3U(content) {
    const lines = content.split('\n');
    let channels = [];
    let current = {};
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            const info = line.substring(8);
            const parts = info.split(',');
            current.name = parts[parts.length - 1].trim();
        } else if (line.startsWith('http')) {
            current.url = line;
            if (current.name && current.url) channels.push(current);
            current = {};
        }
    });
    return channels;
}

function renderChannels(channels) {
    if (!channelGridEl) return;
    channelGridEl.innerHTML = '';
    channels.forEach(ch => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `<div class="channel-name">${ch.name}</div>`;
        card.onclick = () => loadChannel(ch.url, ch.name);
        channelGridEl.appendChild(card);
    });
}

function loadChannel(url, name) {
    if (!videoPlayer) return;

    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play());
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.src = url;
        videoPlayer.addEventListener('loadedmetadata', () => videoPlayer.play());
    }

    if (playerPlaceholder) playerPlaceholder.style.display = 'none';
    if (currentChannelName) currentChannelName.textContent = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function performSearch(query) {
    if (!query) {
        searchResults.innerHTML = '';
        return;
    }
    // If channels not loaded yet (e.g. on other pages), wait or ignore
    if (searchChannels.length === 0) return;

    const results = searchChannels.filter(ch => ch.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
    searchResults.innerHTML = '';
    results.forEach(ch => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.textContent = ch.name;
        item.onclick = () => {
            // If on home, load. If not, go to home with params
            if (videoPlayer) {
                loadChannel(ch.url, ch.name);
                searchOverlay.classList.remove('active');
            } else {
                window.location.href = `index.html?play=${encodeURIComponent(ch.url)}&name=${encodeURIComponent(ch.name)}`;
            }
        };
        searchResults.appendChild(item);
    });
}
