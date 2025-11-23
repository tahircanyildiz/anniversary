// ============================================
// PUBLIC VIEW APPLICATION
// Premium Anniversary Experience
// ============================================

import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    orderBy
} from './firebase-config.js';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initStartButton();
    initLightbox();
    initSecretSection();
    initMusicPlayer();
    loadAllData();
});

// ============================================
// SCROLL ANIMATIONS (IntersectionObserver)
// ============================================

function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Special handling for timeline items
                if (entry.target.classList.contains('timeline-item')) {
                    entry.target.querySelector('.timeline-dot')?.classList.add('active');
                }
            }
        });
    }, observerOptions);

    // Observe all fade-in elements
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .timeline-item').forEach(el => {
        observer.observe(el);
    });
}

// Re-observe newly added elements
function observeNewElements(elements) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
}

// ============================================
// START BUTTON
// ============================================

function initStartButton() {
    const startBtn = document.getElementById('startBtn');
    const counterSection = document.getElementById('counter');

    startBtn?.addEventListener('click', () => {
        counterSection?.scrollIntoView({ behavior: 'smooth' });
    });
}

// ============================================
// LIVE COUNTER
// ============================================

let counterInterval = null;

async function loadAndStartCounter() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            if (data.startDate) {
                const startDate = data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate);
                // İstanbul saat diliminde gece 00:00 olarak ayarla
                const istanbulStart = new Date(startDate.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
                istanbulStart.setHours(0, 0, 0, 0);
                startCounter(istanbulStart);
            }
        } else {
            // Default start date if not set
            startCounter(new Date('2023-01-01T00:00:00+03:00'));
        }
    } catch (error) {
        console.error('Error loading start date:', error);
        // Use default date on error
        startCounter(new Date('2023-01-01T00:00:00+03:00'));
    }
}

function startCounter(startDate) {
    // Clear any existing interval
    if (counterInterval) {
        clearInterval(counterInterval);
    }

    function updateCounter() {
        const now = new Date();
        const diff = now - startDate;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        animateNumber('days', days);
        animateNumber('hours', hours);
        animateNumber('minutes', minutes);
        animateNumber('seconds', seconds);
    }

    // Update immediately, then every second
    updateCounter();
    counterInterval = setInterval(updateCounter, 1000);
}

function animateNumber(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const currentValue = parseInt(element.textContent) || 0;

    if (currentValue !== newValue) {
        element.style.transform = 'translateY(-10px)';
        element.style.opacity = '0';

        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'translateY(10px)';

            setTimeout(() => {
                element.style.transform = 'translateY(0)';
                element.style.opacity = '1';
            }, 50);
        }, 100);
    }
}

// ============================================
// TIMELINE
// ============================================

async function loadTimeline() {
    try {
        const timelineContainer = document.getElementById('timelineContainer');
        const emptyState = document.getElementById('timelineEmpty');

        const q = query(collection(db, 'timeline'), orderBy('date', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Clear existing items except empty state
        const existingItems = timelineContainer.querySelectorAll('.timeline-item');
        existingItems.forEach(item => item.remove());

        snapshot.forEach((doc, index) => {
            const data = doc.data();
            const item = createTimelineItem(data, index);
            timelineContainer.appendChild(item);
        });

        // Re-observe new timeline items
        const newItems = timelineContainer.querySelectorAll('.timeline-item');
        observeNewElements(newItems);

    } catch (error) {
        console.error('Error loading timeline:', error);
    }
}

function createTimelineItem(data, index) {
    const item = document.createElement('div');
    item.className = `timeline-item fade-in${index % 2 === 0 ? '-left' : '-right'}`;

    // Format date
    let dateStr = '';
    if (data.date) {
        const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
        dateStr = date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-date">${dateStr}</div>
        <h3 class="timeline-title">${escapeHtml(data.title || '')}</h3>
        <p class="timeline-description">${escapeHtml(data.description || '')}</p>
    `;

    return item;
}

// ============================================
// GALLERY
// ============================================

async function loadGallery() {
    try {
        const galleryGrid = document.getElementById('galleryGrid');
        const emptyState = document.getElementById('galleryEmpty');

        const q = query(collection(db, 'gallery'), orderBy('uploadedAt', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Clear existing items except empty state
        const existingItems = galleryGrid.querySelectorAll('.gallery-item');
        existingItems.forEach(item => item.remove());

        snapshot.forEach((doc) => {
            const data = doc.data();
            const item = createGalleryItem(data);
            galleryGrid.appendChild(item);
        });

        // Re-observe new gallery items
        const newItems = galleryGrid.querySelectorAll('.gallery-item');
        observeNewElements(newItems);

    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

function createGalleryItem(data) {
    const item = document.createElement('div');
    item.className = 'gallery-item fade-in';

    const img = document.createElement('img');
    img.src = data.url || '';
    img.alt = data.caption || 'Anı';
    img.loading = 'lazy';

    // Add click handler for lightbox
    item.addEventListener('click', () => openLightbox(data.url));

    item.appendChild(img);
    return item;
}

// ============================================
// LIGHTBOX
// ============================================

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxImg = document.getElementById('lightboxImg');

    lightboxClose?.addEventListener('click', closeLightbox);

    lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
        }
    });
}

function openLightbox(imageUrl) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');

    if (lightbox && lightboxImg && imageUrl) {
        lightboxImg.src = imageUrl;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox?.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// FLIP CARDS (Reasons)
// ============================================

async function loadReasons() {
    try {
        const reasonsGrid = document.getElementById('reasonsGrid');
        const emptyState = document.getElementById('reasonsEmpty');

        const q = query(collection(db, 'reasons'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Clear existing items except empty state
        const existingItems = reasonsGrid.querySelectorAll('.flip-card');
        existingItems.forEach(item => item.remove());

        snapshot.forEach((doc, index) => {
            const data = doc.data();
            const card = createFlipCard(data, index + 1);
            reasonsGrid.appendChild(card);
        });

        // Re-observe new cards
        const newItems = reasonsGrid.querySelectorAll('.flip-card');
        observeNewElements(newItems);

    } catch (error) {
        console.error('Error loading reasons:', error);
    }
}

function createFlipCard(data, number) {
    const card = document.createElement('div');
    card.className = 'flip-card fade-in';

    card.innerHTML = `
        <div class="flip-card-inner">
            <div class="flip-card-front">
                <span class="card-number">${number}</span>
                <span class="card-label">Sebep #${number}</span>
                <span class="tap-hint">Görmek için dokun</span>
            </div>
            <div class="flip-card-back">
                <p>${escapeHtml(data.text || '')}</p>
            </div>
        </div>
    `;

    // Add click handler to flip
    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
    });

    return card;
}

// ============================================
// SPOTIFY EMBED PLAYER
// ============================================

async function loadSpotifyEmbed() {
    try {
        const container = document.getElementById('spotifyContainer');
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();

            if (data.spotifyUrl) {
                // Spotify URL'sini embed URL'sine çevir
                const embedUrl = convertToSpotifyEmbed(data.spotifyUrl);

                if (embedUrl) {
                    container.innerHTML = `
                        <iframe
                            src="${embedUrl}"
                            width="100%"
                            height="352"
                            frameBorder="0"
                            allowfullscreen=""
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy">
                        </iframe>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="spotify-placeholder">
                            <p>Geçersiz Spotify linki</p>
                        </div>
                    `;
                }
            } else {
                container.innerHTML = `
                    <div class="spotify-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                            <circle cx="12" cy="12" r="10"/>
                            <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                        </svg>
                        <p>Henüz şarkı eklenmemiş</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading Spotify embed:', error);
    }
}

function convertToSpotifyEmbed(url) {
    // Spotify URL formatları:
    // https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
    // https://open.spotify.com/intl-tr/track/3mKROVyu4lbpYoSfJYCJvQ
    // https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3
    // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M

    if (!url) return null;

    // URL'den type ve id'yi çıkar (intl-xx desteği ile)
    const regex = /spotify\.com\/(intl-[a-z]{2}\/)?(track|album|playlist)\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);

    if (match) {
        const type = match[2]; // intl varsa 2. grup, yoksa 1. grup
        const id = match[3];   // intl varsa 3. grup, yoksa 2. grup
        return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }

    return null;
}

// Eski fonksiyonları kaldırıyorum, artık Spotify embed kullanıyoruz
function initMusicPlayer() {
    // Spotify embed için özel bir init gerekmiyor
}

// ============================================
// SECRET SECTION (Long Press)
// ============================================

let holdTimer = null;
let holdStartTime = null;
let holdDuration = 3000; // 3 seconds

function initSecretSection() {
    const holdBtn = document.getElementById('holdBtn');
    const holdProgress = document.getElementById('holdProgress');
    const secretModal = document.getElementById('secretModal');
    const letterClose = document.getElementById('letterClose');

    if (!holdBtn) return;

    // Mouse events
    holdBtn.addEventListener('mousedown', startHold);
    holdBtn.addEventListener('mouseup', endHold);
    holdBtn.addEventListener('mouseleave', endHold);

    // Touch events for mobile
    holdBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startHold();
    });
    holdBtn.addEventListener('touchend', endHold);
    holdBtn.addEventListener('touchcancel', endHold);

    // Close modal
    letterClose?.addEventListener('click', closeSecretModal);
    secretModal?.addEventListener('click', (e) => {
        if (e.target === secretModal) {
            closeSecretModal();
        }
    });
}

function startHold() {
    const holdBtn = document.getElementById('holdBtn');
    const holdProgress = document.getElementById('holdProgress');

    holdBtn.classList.add('holding');
    holdStartTime = Date.now();

    // Update progress
    holdTimer = setInterval(() => {
        const elapsed = Date.now() - holdStartTime;
        const percent = Math.min((elapsed / holdDuration) * 100, 100);

        if (holdProgress) {
            holdProgress.style.width = `${percent}%`;
        }

        if (elapsed >= holdDuration) {
            endHold();
            unlockSecret();
        }
    }, 16);
}

function endHold() {
    const holdBtn = document.getElementById('holdBtn');
    const holdProgress = document.getElementById('holdProgress');

    holdBtn?.classList.remove('holding');

    if (holdTimer) {
        clearInterval(holdTimer);
        holdTimer = null;
    }

    // Reset progress if not completed
    if (holdProgress) {
        holdProgress.style.width = '0%';
    }
}

async function unlockSecret() {
    const secretModal = document.getElementById('secretModal');
    const letterContent = document.getElementById('letterContent');

    // Load secret letter from Firebase
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            if (data.secretLetter) {
                // Convert line breaks to paragraphs
                const paragraphs = data.secretLetter.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
                letterContent.innerHTML = paragraphs || '<p>Henüz mektup yazılmamış...</p>';
            } else {
                letterContent.innerHTML = '<p>Henüz mektup yazılmamış...</p>';
            }
        }
    } catch (error) {
        console.error('Error loading secret letter:', error);
        letterContent.innerHTML = '<p>Mektup yüklenemedi...</p>';
    }

    // Show modal
    secretModal?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSecretModal() {
    const secretModal = document.getElementById('secretModal');
    secretModal?.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// LOAD ALL DATA
// ============================================

async function loadAllData() {
    // Load all data in parallel
    await Promise.all([
        loadAndStartCounter(),
        loadTimeline(),
        loadGallery(),
        loadReasons(),
        loadSpotifyEmbed()
    ]);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
