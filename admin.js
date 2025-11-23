// ============================================
// ADMIN PANEL APPLICATION
// Premium Anniversary Experience CMS
// ============================================

import {
    db,
    auth,
    cloudinaryConfig,
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    orderBy,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from './firebase-config.js';

// ============================================
// STATE & REFERENCES
// ============================================

let currentUser = null;
let deleteCallback = null;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const loginContainer = document.getElementById('loginContainer');
const adminContainer = document.getElementById('adminContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    initTabs();
    initModals();
    initTimelineManager();
    initGalleryManager();
    initReasonsManager();
    initSettingsManager();
});

// ============================================
// AUTHENTICATION
// ============================================

function initAuthListener() {
    onAuthStateChanged(auth, (user) => {
        hideLoading();

        if (user) {
            currentUser = user;
            showAdmin();
            loadAllData();
        } else {
            currentUser = null;
            showLogin();
        }
    });
}

// Login form submission
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    try {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner"></span> Giriş yapılıyor...';
        hideLoginError();

        await signInWithEmailAndPassword(auth, email, password);

    } catch (error) {
        console.error('Login error:', error);
        showLoginError(getAuthErrorMessage(error.code));
        loginBtn.disabled = false;
        loginBtn.textContent = 'Giriş Yap';
    }
});

// Logout
logoutBtn?.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Çıkış yapılırken hata oluştu', 'error');
    }
});

function getAuthErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Geçersiz e-posta adresi',
        'auth/user-disabled': 'Bu hesap devre dışı bırakılmış',
        'auth/user-not-found': 'Bu e-posta ile hesap bulunamadı',
        'auth/wrong-password': 'Yanlış şifre',
        'auth/invalid-credential': 'Geçersiz e-posta veya şifre',
        'auth/too-many-requests': 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin'
    };
    return messages[code] || 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
}

function hideLoginError() {
    loginError.classList.remove('show');
}

function showLogin() {
    loginContainer.style.display = 'flex';
    adminContainer.classList.remove('active');
}

function showAdmin() {
    loginContainer.style.display = 'none';
    adminContainer.classList.add('active');
    if (currentUser) {
        userEmailEl.textContent = currentUser.email;
    }
}

function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// ============================================
// TAB NAVIGATION
// ============================================

function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Hide all panels
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            // Activate clicked tab
            tab.classList.add('active');
            const panelId = `${tab.dataset.tab}-panel`;
            document.getElementById(panelId)?.classList.add('active');
        });
    });
}

// ============================================
// MODAL MANAGEMENT
// ============================================

function initModals() {
    // Timeline modal
    setupModal('timelineModal', 'timelineModalClose', 'cancelTimeline');

    // Reason modal
    setupModal('reasonModal', 'reasonModalClose', 'cancelReason');

    // Delete modal
    setupModal('deleteModal', 'deleteModalClose', 'cancelDelete');
}

function setupModal(modalId, closeId, cancelId) {
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeId);
    const cancelBtn = document.getElementById(cancelId);

    closeBtn?.addEventListener('click', () => closeModal(modalId));
    cancelBtn?.addEventListener('click', () => closeModal(modalId));

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// ============================================
// TIMELINE MANAGER
// ============================================

function initTimelineManager() {
    const addBtn = document.getElementById('addTimelineBtn');
    const form = document.getElementById('timelineForm');

    addBtn?.addEventListener('click', () => {
        document.getElementById('timelineModalTitle').textContent = 'Yeni Anı Ekle';
        document.getElementById('timelineId').value = '';
        form.reset();
        openModal('timelineModal');
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTimelineEvent();
    });
}

async function loadTimeline() {
    try {
        const list = document.getElementById('timelineList');
        list.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';

        const q = query(collection(db, 'timeline'), orderBy('date', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    <p>Henüz anı eklenmemiş</p>
                    <button class="btn btn-small btn-outline" onclick="document.getElementById('addTimelineBtn').click()">İlk anını ekle</button>
                </div>
            `;
            return;
        }

        list.innerHTML = '';

        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const item = createTimelineListItem(docSnapshot.id, data);
            list.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading timeline:', error);
        showToast('Timeline yüklenirken hata oluştu', 'error');
    }
}

function createTimelineListItem(id, data) {
    const item = document.createElement('div');
    item.className = 'list-item';

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
        <div class="list-item-content">
            <h4>${escapeHtml(data.title || '')}</h4>
            <p>${escapeHtml(data.description || '')}</p>
            <span class="date">${dateStr}</span>
        </div>
        <div class="list-item-actions">
            <button class="btn btn-small btn-outline edit-btn">Düzenle</button>
            <button class="btn btn-small btn-danger delete-btn">Sil</button>
        </div>
    `;

    // Edit button
    item.querySelector('.edit-btn').addEventListener('click', () => {
        editTimelineEvent(id, data);
    });

    // Delete button
    item.querySelector('.delete-btn').addEventListener('click', () => {
        confirmDelete(() => deleteTimelineEvent(id));
    });

    return item;
}

function editTimelineEvent(id, data) {
    document.getElementById('timelineModalTitle').textContent = 'Anıyı Düzenle';
    document.getElementById('timelineId').value = id;

    // Format date for input
    let dateValue = '';
    if (data.date) {
        const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
        dateValue = date.toISOString().split('T')[0];
    }

    document.getElementById('eventDate').value = dateValue;
    document.getElementById('eventTitle').value = data.title || '';
    document.getElementById('eventDescription').value = data.description || '';

    openModal('timelineModal');
}

async function saveTimelineEvent() {
    const id = document.getElementById('timelineId').value;
    const date = document.getElementById('eventDate').value;
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;

    const eventData = {
        date: new Date(date),
        title,
        description,
        updatedAt: new Date()
    };

    try {
        if (id) {
            // Update existing
            await updateDoc(doc(db, 'timeline', id), eventData);
            showToast('Anı güncellendi', 'success');
        } else {
            // Add new
            eventData.createdAt = new Date();
            await addDoc(collection(db, 'timeline'), eventData);
            showToast('Anı eklendi', 'success');
        }

        closeModal('timelineModal');
        loadTimeline();

    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Anı kaydedilirken hata oluştu', 'error');
    }
}

async function deleteTimelineEvent(id) {
    try {
        await deleteDoc(doc(db, 'timeline', id));
        showToast('Anı silindi', 'success');
        loadTimeline();
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Anı silinirken hata oluştu', 'error');
    }
}

// ============================================
// GALLERY MANAGER (CLOUDINARY)
// ============================================

function initGalleryManager() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea?.addEventListener('click', () => fileInput.click());

    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--accent)';
    });

    uploadArea?.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--border-color)';
    });

    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border-color)';
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    });

    fileInput?.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });
}

async function loadGallery() {
    try {
        const grid = document.getElementById('galleryAdminGrid');
        grid.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';

        const q = query(collection(db, 'gallery'), orderBy('uploadedAt', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <p>Henüz fotoğraf yüklenmemiş</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';

        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const item = createGalleryAdminItem(docSnapshot.id, data);
            grid.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading gallery:', error);
        showToast('Galeri yüklenirken hata oluştu', 'error');
    }
}

function createGalleryAdminItem(id, data) {
    const item = document.createElement('div');
    item.className = 'gallery-admin-item';

    item.innerHTML = `
        <img src="${data.url}" alt="${data.caption || 'Fotoğraf'}">
        <div class="delete-overlay">
            <button class="btn btn-small btn-danger">Sil</button>
        </div>
    `;

    item.querySelector('.btn-danger').addEventListener('click', () => {
        confirmDelete(() => deleteGalleryItem(id, data.publicId));
    });

    return item;
}

// Cloudinary'e fotoğraf yükle
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error('Cloudinary upload failed');
    }

    return await response.json();
}

async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    // Cloudinary config kontrolü
    if (cloudinaryConfig.cloudName === "SENIN_CLOUD_NAME" || cloudinaryConfig.uploadPreset === "SENIN_UPLOAD_PRESET") {
        showToast('Lütfen önce Cloudinary ayarlarını yapılandırın!', 'error');
        alert('Cloudinary ayarları yapılmamış!\n\n1. cloudinary.com adresine git\n2. Ücretsiz hesap oluştur\n3. firebase-config.js dosyasındaki cloudName ve uploadPreset değerlerini güncelle');
        return;
    }

    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('uploadProgressFill');
    const statusText = document.getElementById('uploadStatus');

    progressContainer.style.display = 'block';

    const totalFiles = files.length;
    let uploadedCount = 0;

    for (const file of files) {
        // Validate file
        if (!file.type.startsWith('image/')) {
            showToast(`${file.name} bir resim dosyası değil`, 'error');
            continue;
        }

        if (file.size > 10 * 1024 * 1024) { // Cloudinary ücretsiz plan 10MB'a kadar izin veriyor
            showToast(`${file.name} 10MB'dan büyük`, 'error');
            continue;
        }

        try {
            statusText.textContent = `${file.name} yükleniyor...`;

            // Cloudinary'e yükle
            const result = await uploadToCloudinary(file);

            // Firestore'a kaydet
            await addDoc(collection(db, 'gallery'), {
                url: result.secure_url,
                publicId: result.public_id,
                caption: file.name,
                uploadedAt: new Date()
            });

            uploadedCount++;
            const progress = (uploadedCount / totalFiles) * 100;
            progressFill.style.width = `${progress}%`;

        } catch (error) {
            console.error('Error uploading file:', error);
            showToast(`${file.name} yüklenirken hata oluştu`, 'error');
        }
    }

    // Reset and reload
    setTimeout(() => {
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
        document.getElementById('fileInput').value = '';

        if (uploadedCount > 0) {
            showToast(`${uploadedCount} fotoğraf yüklendi`, 'success');
            loadGallery();
        }
    }, 500);
}

async function deleteGalleryItem(id, publicId) {
    try {
        // Not: Cloudinary'den silmek için backend gerekiyor
        // Şimdilik sadece Firestore'dan siliyoruz
        // Fotoğraf Cloudinary'de kalacak ama sorun değil

        // Delete from Firestore
        await deleteDoc(doc(db, 'gallery', id));

        showToast('Fotoğraf silindi', 'success');
        loadGallery();

    } catch (error) {
        console.error('Error deleting photo:', error);
        showToast('Fotoğraf silinirken hata oluştu', 'error');
    }
}

// ============================================
// REASONS MANAGER
// ============================================

function initReasonsManager() {
    const addBtn = document.getElementById('addReasonBtn');
    const form = document.getElementById('reasonForm');

    addBtn?.addEventListener('click', () => {
        document.getElementById('reasonModalTitle').textContent = 'Yeni Sebep Ekle';
        document.getElementById('reasonId').value = '';
        form.reset();
        openModal('reasonModal');
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveReason();
    });
}

async function loadReasons() {
    try {
        const list = document.getElementById('reasonsList');
        list.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';

        const q = query(collection(db, 'reasons'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <p>Henüz sebep eklenmemiş</p>
                    <button class="btn btn-small btn-outline" onclick="document.getElementById('addReasonBtn').click()">İlk sebebi ekle</button>
                </div>
            `;
            return;
        }

        list.innerHTML = '';

        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const item = createReasonListItem(docSnapshot.id, data);
            list.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading reasons:', error);
        showToast('Sebepler yüklenirken hata oluştu', 'error');
    }
}

function createReasonListItem(id, data) {
    const item = document.createElement('div');
    item.className = 'list-item';

    item.innerHTML = `
        <div class="list-item-content" style="display: flex; gap: 1rem; align-items: flex-start;">
            <span class="reason-number">#${data.order || '?'}</span>
            <div>
                <p>${escapeHtml(data.text || '')}</p>
            </div>
        </div>
        <div class="list-item-actions">
            <button class="btn btn-small btn-outline edit-btn">Düzenle</button>
            <button class="btn btn-small btn-danger delete-btn">Sil</button>
        </div>
    `;

    // Edit button
    item.querySelector('.edit-btn').addEventListener('click', () => {
        editReason(id, data);
    });

    // Delete button
    item.querySelector('.delete-btn').addEventListener('click', () => {
        confirmDelete(() => deleteReason(id));
    });

    return item;
}

function editReason(id, data) {
    document.getElementById('reasonModalTitle').textContent = 'Sebebi Düzenle';
    document.getElementById('reasonId').value = id;
    document.getElementById('reasonOrder').value = data.order || 1;
    document.getElementById('reasonText').value = data.text || '';

    openModal('reasonModal');
}

async function saveReason() {
    const id = document.getElementById('reasonId').value;
    const order = parseInt(document.getElementById('reasonOrder').value);
    const text = document.getElementById('reasonText').value;

    const reasonData = {
        order,
        text,
        updatedAt: new Date()
    };

    try {
        if (id) {
            await updateDoc(doc(db, 'reasons', id), reasonData);
            showToast('Sebep güncellendi', 'success');
        } else {
            reasonData.createdAt = new Date();
            await addDoc(collection(db, 'reasons'), reasonData);
            showToast('Sebep eklendi', 'success');
        }

        closeModal('reasonModal');
        loadReasons();

    } catch (error) {
        console.error('Error saving reason:', error);
        showToast('Sebep kaydedilirken hata oluştu', 'error');
    }
}

async function deleteReason(id) {
    try {
        await deleteDoc(doc(db, 'reasons', id));
        showToast('Sebep silindi', 'success');
        loadReasons();
    } catch (error) {
        console.error('Error deleting reason:', error);
        showToast('Sebep silinirken hata oluştu', 'error');
    }
}

// ============================================
// SETTINGS MANAGER
// ============================================

function initSettingsManager() {
    const saveStartDateBtn = document.getElementById('saveStartDate');
    const saveMusicBtn = document.getElementById('saveMusicSettings');
    const saveLetterBtn = document.getElementById('saveSecretLetter');

    saveStartDateBtn?.addEventListener('click', saveStartDate);
    saveMusicBtn?.addEventListener('click', saveMusicSettings);
    saveLetterBtn?.addEventListener('click', saveSecretLetter);
}

async function loadSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();

            // Start date
            if (data.startDate) {
                const date = data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate);
                document.getElementById('startDate').value = date.toISOString().split('T')[0];
            }

            // Spotify URL
            document.getElementById('spotifyUrl').value = data.spotifyUrl || '';

            // Secret letter
            document.getElementById('secretLetter').value = data.secretLetter || '';
        }

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveStartDate() {
    const startDate = document.getElementById('startDate').value;

    if (!startDate) {
        showToast('Lütfen bir tarih seçin', 'error');
        return;
    }

    try {
        await setDoc(doc(db, 'settings', 'general'), {
            startDate: new Date(startDate)
        }, { merge: true });

        showToast('Başlangıç tarihi kaydedildi', 'success');

    } catch (error) {
        console.error('Error saving start date:', error);
        showToast('Tarih kaydedilirken hata oluştu', 'error');
    }
}

async function saveMusicSettings() {
    const spotifyUrl = document.getElementById('spotifyUrl').value;

    if (!spotifyUrl) {
        showToast('Lütfen bir Spotify linki girin', 'error');
        return;
    }

    // Spotify URL formatını kontrol et (intl-xx desteği ile)
    const regex = /spotify\.com\/(intl-[a-z]{2}\/)?(track|album|playlist)\/([a-zA-Z0-9]+)/;
    if (!regex.test(spotifyUrl)) {
        showToast('Geçersiz Spotify linki. Örnek: https://open.spotify.com/track/...', 'error');
        return;
    }

    try {
        await setDoc(doc(db, 'settings', 'general'), {
            spotifyUrl
        }, { merge: true });

        showToast('Spotify linki kaydedildi', 'success');

    } catch (error) {
        console.error('Error saving Spotify URL:', error);
        showToast('Spotify linki kaydedilirken hata oluştu', 'error');
    }
}

async function saveSecretLetter() {
    const secretLetter = document.getElementById('secretLetter').value;

    try {
        await setDoc(doc(db, 'settings', 'general'), {
            secretLetter
        }, { merge: true });

        showToast('Gizli mektup kaydedildi', 'success');

    } catch (error) {
        console.error('Error saving secret letter:', error);
        showToast('Mektup kaydedilirken hata oluştu', 'error');
    }
}

// ============================================
// DELETE CONFIRMATION
// ============================================

function confirmDelete(callback) {
    deleteCallback = callback;
    openModal('deleteModal');

    document.getElementById('confirmDelete').onclick = async () => {
        closeModal('deleteModal');
        if (deleteCallback) {
            await deleteCallback();
            deleteCallback = null;
        }
    };
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// LOAD ALL DATA
// ============================================

async function loadAllData() {
    await Promise.all([
        loadTimeline(),
        loadGallery(),
        loadReasons(),
        loadSettings()
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
