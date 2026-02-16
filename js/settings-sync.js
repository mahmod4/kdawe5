// Settings Sync - جلب الإعدادات من لوحة التحكم وتحديث الموقع
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { getFirestore, doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';

// Firebase configuration - نفس الإعدادات في لوحة التحكم
const firebaseConfig = {
    apiKey: "AIzaSyAWkruoIMbTxD-5DHCpspPY8p2TtZLLmLM",
    authDomain: "dashboard-27bc8.firebaseapp.com",
    projectId: "dashboard-27bc8",
    storageBucket: "dashboard-27bc8.firebasestorage.app",
    messagingSenderId: "707339591256",
    appId: "1:707339591256:web:dcc2649182e97249a2742d",
    measurementId: "G-K8FNNYH4S1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global settings object
let siteSettings = {
    store: {},
    content: {},
    categories: [],
    offers: []
};

// Load all settings from Firebase
export async function loadAllSettings() {
    try {
        console.log('Loading settings from dashboard...');
        
        // Load store settings
        await loadStoreSettings();
        
        // Load content settings
        await loadContentSettings();
        
        // Load categories
        await loadCategories();
        
        // Load active offers
        await loadOffers();
        
        console.log('All settings loaded successfully');
        return siteSettings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return siteSettings;
    }
}

// Load store settings (اسم المتجر، معلومات الاتصال، إلخ)
async function loadStoreSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
            siteSettings.store = settingsDoc.data();
            updateStoreElements();
        }
    } catch (error) {
        console.error('Error loading store settings:', error);
    }
}

// Load content settings (بانر، صفحات ثابتة)
async function loadContentSettings() {
    try {
        const contentDoc = await getDoc(doc(db, 'content', 'main'));
        if (contentDoc.exists()) {
            siteSettings.content = contentDoc.data();
            updateContentElements();
        }
    } catch (error) {
        console.error('Error loading content settings:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        siteSettings.categories = categoriesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        updateCategoriesElements();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load active offers
async function loadOffers() {
    try {
        const offersSnapshot = await getDocs(collection(db, 'offers'));
        const now = new Date();
        
        siteSettings.offers = offersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(offer => {
                if (!offer.active) return false;
                if (offer.startDate && offer.startDate.toDate() > now) return false;
                if (offer.endDate && offer.endDate.toDate() < now) return false;
                return true;
            });
        
        updateOffersElements();
    } catch (error) {
        console.error('Error loading offers:', error);
    }
}

// Update store elements in the page
function updateStoreElements() {
    const store = siteSettings.store;
    
    // Update store name
    const storeNameElements = document.querySelectorAll('[data-store-name]');
    storeNameElements.forEach(el => {
        if (store.storeName) {
            el.textContent = store.storeName;
            console.log(`Updated store name element to: ${store.storeName}`);
        }
    });
    
    // Update page title
    if (store.storeName) {
        const currentTitle = (document.title || '').trim();
        let baseTitle = currentTitle;
        if (currentTitle.includes('|')) {
            baseTitle = currentTitle.split('|')[0].trim();
        }
        document.title = baseTitle ? `${baseTitle} | ${store.storeName}` : store.storeName;
        console.log(`Updated page title to: ${document.title}`);
    }
    
    // Update meta tags
    updateMetaTags(store);
    
    // Update contact information
    updateContactInfo(store);
    
    // Update social links
    updateSocialLinks(store);
    
    // Update store logo
    updateStoreLogo(store);

    // Update hero horizontal scroll images
    updateHeroScroll(store);

    // Sync APP_SETTINGS used by legacy pages/scripts
    syncAppSettingsFromStore(store);

    // Apply responsive layout settings (products grid columns)
    applyStoreLayoutSettings(store);
}

function updateHeroScroll(store) {
    try {
        const container = document.getElementById('heroScrollContainer');
        if (!container) return;

        const images = Array.isArray(store.heroScrollImages) ? store.heroScrollImages : [];
        container.innerHTML = '';

        if (!images.length) {
            return;
        }

        images.forEach((url) => {
            if (!url) return;
            const item = document.createElement('div');
            item.className = 'hero-scroll-item';

            const img = document.createElement('img');
            img.src = String(url);
            img.alt = store.storeName ? String(store.storeName) : 'banner';
            img.loading = 'lazy';

            item.appendChild(img);
            container.appendChild(item);
        });
    } catch (e) {
        console.warn('Error updating hero scroll:', e);
    }
}

function applyStoreLayoutSettings(store) {
    try {
        const root = document.documentElement;
        if (!root || !root.style) return;

        const mobile = Number(store.gridColumnsMobile);
        const tablet = Number(store.gridColumnsTablet);
        const desktop = Number(store.gridColumnsDesktop);

        if (!Number.isNaN(mobile) && mobile > 0) root.style.setProperty('--products-cols-mobile', String(mobile));
        if (!Number.isNaN(tablet) && tablet > 0) root.style.setProperty('--products-cols-tablet', String(tablet));
        if (!Number.isNaN(desktop) && desktop > 0) root.style.setProperty('--products-cols-desktop', String(desktop));
    } catch (e) {
        console.warn('Failed to apply store layout settings:', e);
    }
}

function syncAppSettingsFromStore(store) {
    if (!window.APP_SETTINGS) return;

    if (typeof store.shippingBaseCost !== 'undefined') {
        const v = Number(store.shippingBaseCost);
        if (!Number.isNaN(v)) window.APP_SETTINGS.DELIVERY_FEE = v;
    }

    const phones = [];
    if (store.storePhone) phones.push(String(store.storePhone));
    if (Array.isArray(store.contactPhones) && store.contactPhones.length) {
        store.contactPhones.forEach(p => phones.push(String(p)));
    }
    if (phones.length) window.APP_SETTINGS.CONTACT_PHONES = phones;

    if (store.socialWhatsapp) {
        window.APP_SETTINGS.WHATSAPP_PHONE = String(store.socialWhatsapp)
            .replace(/\s+/g, '')
            .replace(/^\+/, '')
            .replace(/[^0-9]/g, '');
    }

    if (Array.isArray(store.branches)) {
        window.APP_SETTINGS.BRANCHES = store.branches;
    }

    try {
        window.dispatchEvent(new CustomEvent('appSettingsUpdated', { detail: { store } }));
    } catch (e) {
    }
}

// Update content elements
function updateContentElements() {
    const content = siteSettings.content;
    
    // Update banner
    updateBanner(content);
    
    // Update footer content
    updateFooterContent(content);

    applyContentBindings(content);
}

function applyContentBindings(content) {
    const nodes = document.querySelectorAll('[data-content-key]');
    if (!nodes || !nodes.length) return;

    nodes.forEach((el) => {
        const key = el.getAttribute('data-content-key');
        if (!key) return;
        const value = content ? content[key] : undefined;
        if (typeof value === 'undefined' || value === null) return;

        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'img') {
            el.src = String(value);
            el.style.display = 'block';
            return;
        }

        if (tag === 'a') {
            el.href = String(value);
            el.style.display = 'inline';
            return;
        }

        if (tag === 'input' || tag === 'textarea') {
            el.value = String(value);
            return;
        }

        el.textContent = String(value);
    });
}

// Update categories in navigation and icons
function updateCategoriesElements() {
    // Update navigation categories
    const categoriesContainer = document.querySelector('[data-categories]');
    if (categoriesContainer && siteSettings.categories.length > 0) {
        categoriesContainer.innerHTML = siteSettings.categories.map(category => `
            <li>
                <a href="#category-${category.id}" class="hover:text-blue-600 transition">
                    ${category.name}
                </a>
            </li>
        `).join('');
    }
    
    // Update category icons container
    updateCategoryIcons();
}

// Update category icons in the main page
function updateCategoryIcons() {
    const categoryIconsContainer = document.getElementById('category-icons-container');
    if (!categoryIconsContainer) return;
    
    if (siteSettings.categories.length === 0) return;
    
    // Default icons mapping - expanded with more icons
    const iconMapping = {
        'dairy': 'fa-cheese',
        'grocery': 'fa-shopping-basket',
        'snacks': 'fa-cookie-bite',
        'beverages': 'fa-wine-bottle',
        'cleaning': 'fa-soap',
        'frozen': 'fa-snowflake',
        'canned': 'fa-box',
        'vegetables': 'fa-carrot',
        'fruits': 'fa-apple-alt',
        'meat': 'fa-drumstick-bite',
        'bakery': 'fa-bread-slice',
        'fish': 'fa-fish',
        'poultry': 'fa-drumstick-bite',
        'eggs': 'fa-egg',
        'rice': 'fa-bowl-rice',
        'pasta': 'fa-utensils',
        'oil': 'fa-oil-can',
        'spices': 'fa-pepper-hot',
        'sweets': 'fa-candy-cane',
        'chocolate': 'fa-cookie',
        'nuts': 'fa-seedling',
        'honey': 'fa-jar',
        'juice': 'fa-glass-water',
        'water': 'fa-bottle-water',
        'coffee': 'fa-coffee',
        'tea': 'fa-mug-hot',
        'milk': 'fa-glass-milk',
        'yogurt': 'fa-blender',
        'cheese': 'fa-cheese',
        'butter': 'fa-butter',
        'bread': 'fa-bread-slice',
        'tomatoes': 'fa-circle',
        'potatoes': 'fa-circle',
        'onions': 'fa-circle',
        'garlic': 'fa-circle',
        'cucumber': 'fa-circle',
        'lettuce': 'fa-leaf',
        'peppers': 'fa-pepper-hot',
        'herbs': 'fa-spa',
        'mushrooms': 'fa-circle',
        'corn': 'fa-corn',
        'beans': 'fa-seedling',
        'citrus': 'fa-lemon',
        'berries': 'fa-circle',
        'tropical': 'fa-circle',
        'apples': 'fa-apple-alt',
        'bananas': 'fa-circle',
        'grapes': 'fa-circle',
        'melons': 'fa-circle',
        'paper': 'fa-toilet-paper',
        'plastic': 'fa-box',
        'detergent': 'fa-soap',
        'disposable': 'fa-utensils',
        'baby': 'fa-baby',
        'pet': 'fa-paw',
        'health': 'fa-heart-pulse',
        'cosmetics': 'fa-spray-can',
        'electronics': 'fa-plug',
        'stationery': 'fa-pencil',
        'hardware': 'fa-wrench',
        'garden': 'fa-seedling',
        'auto': 'fa-car',
        'sports': 'fa-football',
        'books': 'fa-book',
        'toys': 'fa-gamepad',
        'seasonal': 'fa-snowflake',
        'offers': 'fa-tag',
        'new': 'fa-star',
        'sale': 'fa-percentage',
        'organic': 'fa-leaf',
        'local': 'fa-map-marker-alt',
        'imported': 'fa-globe',
        'halal': 'fa-certificate',
        'premium': 'fa-crown',
        'basic': 'fa-circle',
        'family': 'fa-users',
        'kids': 'fa-child',
        'adults': 'fa-user'
    };
    
    // Clear existing categories
    categoryIconsContainer.innerHTML = '';
    
    // Add "All Products" category first
    const allCategoryElement = document.createElement('div');
    allCategoryElement.className = 'category selected';
    allCategoryElement.dataset.category = 'all';
    allCategoryElement.innerHTML = `
        <i class="fas fa-store"></i>
        <h3>جميع المنتجات</h3>
    `;
    allCategoryElement.addEventListener('click', () => {
        document.querySelectorAll('.category').forEach(el => el.classList.remove('selected'));
        allCategoryElement.classList.add('selected');
        
        // Update filter if exists
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.value = 'all';
            filterProducts();
        }
    });
    categoryIconsContainer.appendChild(allCategoryElement);
    
    // Add categories from dashboard
    siteSettings.categories.forEach(category => {
        const iconClass = iconMapping[category.name.toLowerCase()] || 'fa-tag';
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category';
        categoryElement.dataset.category = category.id;
        if (category.iconUrl) {
            categoryElement.innerHTML = `
                <img src="${category.iconUrl}" alt="${category.name}" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<i class=\"fas ${iconClass}\"></i>');" />
                <h3>${category.name}</h3>
            `;
        } else {
            categoryElement.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <h3>${category.name}</h3>
            `;
        }
        categoryElement.addEventListener('click', () => {
            // Remove selection from all categories
            document.querySelectorAll('.category').forEach(el => el.classList.remove('selected'));
            // Add selection to current category
            categoryElement.classList.add('selected');
            
            // Update dropdown filter and activate filter
            const categoryFilter = document.getElementById('category-filter');
            if (categoryFilter) {
                categoryFilter.value = category.id;
                filterProducts();
            }
        });
        categoryIconsContainer.appendChild(categoryElement);
    });
}

// Update offers elements
function updateOffersElements() {
    const offersContainer = document.querySelector('[data-offers]');
    if (offersContainer && siteSettings.offers.length > 0) {
        offersContainer.innerHTML = siteSettings.offers.map(offer => `
            <div class="offer-card bg-white rounded-lg shadow-md p-4 border-2 border-red-500">
                <h3 class="text-lg font-bold text-red-600">${offer.name}</h3>
                <p class="text-gray-600 mb-2">${offer.description || ''}</p>
                <div class="text-xl font-bold">
                    خصم ${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' ج.م'}
                </div>
                ${offer.couponCode ? `
                    <div class="mt-2">
                        <span class="bg-gray-100 px-2 py-1 rounded text-sm">
                            كود: ${offer.couponCode}
                        </span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
}

// Update meta tags
function updateMetaTags(store) {
    // Update title meta tag
    const titleMeta = document.querySelector('meta[property="og:title"]');
    if (titleMeta && store.storeName) {
        titleMeta.content = store.storeName;
    }
    
    // Update description
    const descMeta = document.querySelector('meta[property="og:description"]');
    if (descMeta && store.storeAddress) {
        descMeta.content = `${store.storeName} - ${store.storeAddress}`;
    }
}

// Update contact information
function updateContactInfo(store) {
    // Update phone
    const phoneElements = document.querySelectorAll('[data-phone]');
    phoneElements.forEach(el => {
        if (store.storePhone) {
            el.innerHTML = `<p><i data-lucide="phone"></i> <a href="tel:${store.storePhone}">${store.storePhone}</a></p>`;
        }
    });
    
    // Update email
    const emailElements = document.querySelectorAll('[data-email]');
    emailElements.forEach(el => {
        if (store.storeEmail) {
            el.textContent = store.storeEmail;
            el.href = `mailto:${store.storeEmail}`;
        }
    });
    
    // Update address
    const addressElements = document.querySelectorAll('[data-address]');
    addressElements.forEach(el => {
        if (store.storeAddress) {
            el.textContent = store.storeAddress;
        }
    });
}

// Update social links
function updateSocialLinks(store) {
    const socialLinks = {
        facebook: store.socialFacebook,
        twitter: store.socialTwitter,
        instagram: store.socialInstagram,
        whatsapp: store.socialWhatsapp
    };
    
    Object.entries(socialLinks).forEach(([platform, url]) => {
        const elements = document.querySelectorAll(`[data-social-${platform}]`);
        elements.forEach(el => {
            if (url) {
                el.href = platform === 'whatsapp' ? `https://wa.me/${url.replace(/[^\d]/g, '')}` : url;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    });
}

// Update store logo
function updateStoreLogo(store) {
    const logoElements = document.querySelectorAll('[data-store-logo]');
    logoElements.forEach(el => {
        if (store.storeLogo) {
            el.src = store.storeLogo;
            el.style.display = 'block';
        }
    });
}

// Update store info
function updateStoreInfo(store) {
    // Update store name
    const storeNameElements = document.querySelectorAll('[data-store-name]');
    storeNameElements.forEach(el => {
        el.textContent = store.storeName || 'المتجر';
    });
    
    // Update logo
    const logoElements = document.querySelectorAll('[data-store-logo]');
    logoElements.forEach(el => {
        if (store.storeLogo) {
            el.src = store.storeLogo;
        }
    });
    
    // Update store description
    const descriptionElements = document.querySelectorAll('[data-store-description]');
    descriptionElements.forEach(el => {
        if (store.storeDescription) {
            el.setAttribute('content', store.storeDescription);
        }
    });
    
    // Update keywords
    const keywordsElements = document.querySelectorAll('[data-store-keywords]');
    keywordsElements.forEach(el => {
        if (store.storeKeywords) {
            el.setAttribute('content', store.storeKeywords);
        }
    });
    
    // Update Google Analytics ID
    const analyticsElements = document.querySelectorAll('[data-google-analytics-id]');
    analyticsElements.forEach(el => {
        if (store.googleAnalyticsId) {
            el.textContent = store.googleAnalyticsId;
        }
    });
    
    // Update favicon links
    const faviconElements = document.querySelectorAll('[data-store-favicon]');
    faviconElements.forEach(el => {
        if (store.storeLogo) {
            el.setAttribute('href', store.storeLogo);
        }
    });
    
    // Update Open Graph information
    const ogTitleElements = document.querySelectorAll('[data-store-og-title]');
    ogTitleElements.forEach(el => {
        if (store.storeName) {
            el.setAttribute('content', `${store.storeName} - متجر إلكتروني`);
        }
    });
    
    const ogDescriptionElements = document.querySelectorAll('[data-store-og-description]');
    ogDescriptionElements.forEach(el => {
        if (store.storeDescription) {
            el.setAttribute('content', store.storeDescription);
        }
    });
}

// Update banner
function updateBanner(content) {
    const bannerImage = document.querySelector('[data-banner-image]');
    const bannerLink = document.querySelector('[data-banner-link]');
    const bannerText = document.querySelector('[data-banner-text]');
    
    if (bannerImage && content.bannerImage) {
        bannerImage.src = content.bannerImage;
        bannerImage.style.display = 'block';
    }
    
    if (bannerLink && content.bannerLink) {
        bannerLink.href = content.bannerLink;
    }
    
    if (bannerText && content.bannerText) {
        bannerText.textContent = content.bannerText;
        bannerText.style.display = 'block';
    }
}

// Update footer content
function updateFooterContent(content) {
    // Update footer text if exists
    const footerElements = document.querySelectorAll('[data-footer-content]');
    footerElements.forEach(el => {
        if (content.footerContent) {
            el.textContent = content.footerContent;
        }
    });
}

// Get shipping settings
export function getShippingSettings() {
    return siteSettings.store || {};
}

// Get payment settings
export function getPaymentSettings() {
    return siteSettings.store || {};
}

// Get active offers for cart calculations
export function getActiveOffers() {
    return siteSettings.offers || [];
}

// Auto-sync settings every 5 minutes
setInterval(loadAllSettings, 5 * 60 * 1000);

// Export settings for use in other modules
export { siteSettings };

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadAllSettings);

// Make available globally for non-module scripts
window.siteSettings = siteSettings;

// Make sure category icons are rendered after settings load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (siteSettings.categories.length > 0) {
            updateCategoryIcons();
        }
        
        // Force update store name if not loaded
        if (siteSettings.store && siteSettings.store.storeName) {
            updateStoreElements();
            console.log('Force updated store elements on load');
        }
    }, 3000);
});

// Also try to update after 5 seconds as backup
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (siteSettings.store && siteSettings.store.storeName) {
            updateStoreElements();
            console.log('Backup update of store elements');
        }
    }, 5000);
});
