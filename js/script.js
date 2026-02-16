// ================================
// ================================
//      أسواق الخديوي - سكريبت رئيسي
// ================================
// هذا الملف يحتوي على جميع الوظائف الرئيسية للموقع:
// - إدارة المنتجات والسلة
// - تسجيل الدخول والمستخدمين
// - العروض اليومية
// - التحديث التلقائي
// ================================

// ملاحظة تنظيمية:
// تم تجميع الدوال هنا حسب المسؤوليات (سلة/منتجات/مفضلة/عروض/واجهة).
// أغلب البيانات تأتي من Firestore (لوحة التحكم)، ومع وجود بدائل احتياطية (Sheets/بيانات تجريبية)
// لضمان أن المتجر يعمل أثناء الاختبار المحلي حتى لو لم تتوفر البيانات.

// ================================
// 1. تعريف المتغيرات وعناصر الـ DOM
// ================================
// هذه المتغيرات تحتفظ بالعناصر الأساسية في الصفحة

// عناصر المنتجات والسلة
const productContainer = document.getElementById('product-container'); // حاوية عرض المنتجات
const categoryFilter = document.getElementById('category-filter'); // فلتر الفئات
const searchInput = document.getElementById('search-products'); // مربع البحث
const cartModal = document.getElementById('cart-modal'); // نافذة السلة المنبثقة
const cartItems = document.getElementById('cart-items'); // عناصر السلة
const cartCount = document.getElementById('cart-count'); // عداد السلة
const totalPrice = document.getElementById('total-price'); // السعر الإجمالي
const checkoutBtn = document.getElementById('checkout'); // زر إتمام الشراء
const closeBtn = document.querySelector('.close'); // زر إغلاق السلة

// عناصر قائمة الجوال (الهامبرجر)
const menuToggle = document.querySelector('.main-menu-toggle'); // زر فتح/إغلاق القائمة
const mainMenu = document.querySelector('.main-menu'); // القائمة الرئيسية
const menuItems = document.querySelectorAll('#main-menu li a'); // عناصر القائمة

// ================================
// 2. متغيرات السلة والمنتجات
// ================================
// متغيرات إدارة السلة
let cart = []; // مصفوفة المنتجات في السلة
// استرجاع السلة من localStorage إذا وجدت (للمحافظة على السلة بعد إعادة تحميل الصفحة)
if (localStorage.getItem('cart')) {
  try {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
  } catch (e) {
    cart = []; // في حالة خطأ في قراءة البيانات
  }
}

function getCurrentUser() {
    // جلب المستخدم الحالي من Firebase Auth (إن وجد)
    try {
        if (window.firebase && typeof window.firebase.auth === 'function') {
            return window.firebase.auth().currentUser;
        }
    } catch (e) {
    }
    return null;
}

function redirectToLoginForCheckout() {
    // إلزام تسجيل الدخول قبل إتمام الطلب:
    // نحفظ الرابط الحالي في sessionStorage للعودة بعد تسجيل الدخول
    try {
        sessionStorage.setItem('postLoginRedirect', window.location.href);
    } catch (e) {
    }
    alert('يجب تسجيل الدخول لإكمال الطلب');
    // صفحات المتجر داخل نفس مجلد html
    window.location.href = 'login.html';
}

// متغيرات إدارة المنتجات
let products = []; // جميع المنتجات المحملة من قاعدة البيانات
let currentPage = 1; // الصفحة الحالية في التصفح
const productsPerPage = 15; // عدد المنتجات في كل صفحة
let totalPages = 1; // إجمالي عدد الصفحات
let currentProducts = []; // المنتجات المعروضة حالياً

// ================================
// المفضلة (Guest + Logged-in Sync)
// ================================
// الهدف:
// - الزائر: حفظ المفضلة في localStorage
// - المستخدم المسجل: مزامنة المفضلة مع Firestore داخل users/{uid}
// - عند تسجيل الدخول: دمج مفضلة localStorage مع Firestore (بدون فقد بيانات)
let favorites = [];

function loadFavoritesFromStorage() {
    try {
        const raw = localStorage.getItem('favorites');
        const arr = raw ? JSON.parse(raw) : [];
        favorites = Array.isArray(arr) ? arr.map(String) : [];
    } catch (e) {
        favorites = [];
    }
}

function saveFavoritesToStorage() {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) {
    }
}

function isFavorite(productId) {
    return favorites.includes(String(productId));
}

function updateFavoriteButtons() {
    try {
        document.querySelectorAll('.favorite-btn').forEach((btn) => {
            const id = btn.getAttribute('data-id');
            const fav = isFavorite(id);
            btn.classList.toggle('is-favorite', fav);
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = fav ? 'fas fa-heart' : 'far fa-heart';
            }
        });
    } catch (e) {
    }
}

async function syncFavoritesToFirestore() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        if (!window.firebase || !window.firebase.firestore || !window.firebaseFirestore) return;
        const db = window.firebase.firestore();
        const userRef = window.firebaseFirestore.doc(db, 'users', user.uid);
        await window.firebaseFirestore.setDoc(userRef, {
            favoriteProductIds: favorites,
            updatedAt: new Date()
        }, { merge: true });
    } catch (e) {
        console.warn('تعذر مزامنة المفضلة إلى Firestore:', e);
    }
}

async function loadFavoritesFromFirestoreAndMerge() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        if (!window.firebase || !window.firebase.firestore || !window.firebaseFirestore) return;
        const db = window.firebase.firestore();
        const userRef = window.firebaseFirestore.doc(db, 'users', user.uid);
        const snap = await window.firebaseFirestore.getDoc(userRef);
        const cloudFavs = (snap && snap.exists && snap.exists())
            ? (snap.data().favoriteProductIds || [])
            : [];
        const merged = Array.from(new Set([...(Array.isArray(cloudFavs) ? cloudFavs : []).map(String), ...favorites.map(String)]));
        favorites = merged;
        saveFavoritesToStorage();
        await syncFavoritesToFirestore();
        updateFavoriteButtons();
    } catch (e) {
        console.warn('تعذر جلب/دمج المفضلة من Firestore:', e);
    }
}

function toggleFavorite(productId) {
    // تبديل حالة المنتج في المفضلة (إضافة/إزالة) ثم حفظ/مزامنة
    const id = String(productId);
    if (isFavorite(id)) {
        favorites = favorites.filter((x) => x !== id);
    } else {
        favorites.push(id);
    }
    saveFavoritesToStorage();
    updateFavoriteButtons();
    syncFavoritesToFirestore();
}

function setupFavoritesAuthSync() {
    // إن كانت صفحة المتجر مجهزة بـ firebaseAuth
    try {
        if (window.firebaseAuth && typeof window.firebaseAuth.onAuthStateChanged === 'function' && window.firebase && typeof window.firebase.auth === 'function') {
            window.firebaseAuth.onAuthStateChanged(window.firebase.auth(), (user) => {
                if (user) {
                    loadFavoritesFromFirestoreAndMerge();
                }
            });
        }
    } catch (e) {
    }
}

// ================================
// 3. متغيرات التحديث التلقائي
// ================================
let autoUpdateInterval; // مؤقت التحديث التلقائي
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 دقائق (300,000 مللي ثانية)

// ================================
// 4. متغيرات الهيدر (إدارة شريط التنقل)
// ================================
let lastScrollTop = 0; // آخر موضع تمرير
const header = document.querySelector('header'); // شريط التنقل
const headerHeight = header.offsetHeight; // ارتفاع الشريط
const scrollThreshold = 50; // الحد الأدنى للتمرير لإخفاء/إظهار الشريط

// ================================
// 5. الفئات (من Firebase أولاً ثم من الإعدادات كنسخة احتياطية)
// ================================
// ملاحظة: سيتم تحديث هذا المصفوفة ديناميكياً بعد جلب الفئات من Firestore
let categories = [{ value: 'all', label: 'جميع المنتجات' }];

// إعداد الفئات الافتراضية من APP_SETTINGS (احتياطي)
function loadFallbackCategoriesFromSettings() {
  const fromSettings = (window.APP_SETTINGS && Array.isArray(window.APP_SETTINGS.CATEGORIES))
    ? window.APP_SETTINGS.CATEGORIES.map(c => ({ value: String(c.key), label: String(c.label) }))
    : [
        { value: "dairy", label: "الألبان والجبن" },
        { value: "grocery", label: "البقالة" },
        { value: "snacks", label: "Snacks" },
        { value: "beverages", label: "المشروبات" },
        { value: "cleaning", label: "المنظفات" },
        { value: "frozen", label: "المجمدات" },
        { value: "canned", label: "المعلبات" }
      ];
  categories = [{ value: 'all', label: 'جميع المنتجات' }, ...fromSettings];
}

// جلب الفئات من Firestore (لوحة التحكم)
async function fetchCategoriesFromFirestore() {
  try {
    if (!window.firebase || !window.firebaseFirestore || !window.firebase.firestore) {
      throw new Error('Firebase Firestore غير مهيأ.');
    }

    const db = window.firebase.firestore();
    const colRef = window.firebaseFirestore.collection(db, 'categories');
    const snap = await window.firebaseFirestore.getDocs(colRef);

    const fetchedCategories = snap.docs
      .map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          name: data.name || '',
          order: data.order || 0
        };
      })
      .filter(c => c.name);

    if (fetchedCategories.length === 0) {
      throw new Error('لا توجد فئات في قاعدة البيانات');
    }

    // ترتيب حسب order ثم الاسم احتياطياً
    fetchedCategories.sort((a, b) => {
      if (a.order === b.order) {
        return a.name.localeCompare(b.name, 'ar');
      }
      return a.order - b.order;
    });

    // تحويل لفورمات واجهة المتجر
    categories = [
      { value: 'all', label: 'جميع المنتجات' },
      ...fetchedCategories.map(c => ({
        value: String(c.id),   // نستخدم ID من Firestore ليتوافق مع categoryId في المنتجات
        label: String(c.name)
      }))
    ];

    console.log(`تم تحميل الفئات من Firestore (${fetchedCategories.length} فئة)`);
  } catch (error) {
    console.warn('تعذر تحميل الفئات من Firestore، سيتم استخدام الإعدادات المحلية:', error);
    // في حالة الفشل نستخدم الإعدادات المحلية كنسخة احتياطية
    loadFallbackCategoriesFromSettings();
  }
}

// ================================
// 6. أحداث تحميل الصفحة
// ================================
document.addEventListener('DOMContentLoaded', () => {
    // تحميل المفضلة أولاً
    loadFavoritesFromStorage();

    // إضافة كلاس للجسم إذا كان الجهاز يدعم اللمس
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device');
    }
    // تحميل الفئات من Firestore أولاً ثم تحميل المنتجات
    // هذا يضمن أن الفلاتر والأيقونات مبنية على نفس البيانات الموجودة في لوحة التحكم
    try {
        fetchCategoriesFromFirestore()
            .then(() => {
                // بعد جلب الفئات، نقوم بتعبئة الفلتر وأيقونات الأقسام
                try {
                    populateCategoryFilter();
                    // ثم تحميل المنتجات التي تعتمد على حقل category / categoryId من Firestore
                    loadProducts();
                } catch (error) {
                    console.warn('خطأ في تحميل المنتجات:', error);
                    loadFallbackCategoriesFromSettings();
                    populateCategoryFilter();
                    loadProducts();
                }
            })
            .catch((error) => {
                console.warn('خطأ في جلب الفئات من Firestore:', error);
                // في حالة أي خطأ غير متوقع، نستخدم الإعدادات المحلية كاحتياطي
                try {
                    loadFallbackCategoriesFromSettings();
                    populateCategoryFilter();
                    loadProducts();
                } catch (fallbackError) {
                    console.error('خطأ في تحميل الإعدادات الاحتياطية:', fallbackError);
                }
            });
    } catch (error) {
        console.error('خطأ عام في تهيئة تحميل البيانات:', error);
        // محاولة تحميل الإعدادات المحلية مباشرة
        try {
            loadFallbackCategoriesFromSettings();
            populateCategoryFilter();
            loadProducts();
        } catch (fallbackError) {
            console.error('خطأ في التحميل الاحتياطي النهائي:', fallbackError);
        }
    }
    // تفعيل الأحداث
    setupEventListeners();
    handleMobileMenu();
    setActiveNavItem();
    // تحميل الصور ببطء
    lazyLoadImages();
    // تحديث التخطيط عند تغيير الاتجاه
    window.addEventListener('orientationchange', () => {
        setTimeout(() => { updateLayoutOnOrientationChange(); }, 200);
    });
    // مراقبة التمرير للهيدر
    window.addEventListener('scroll', debounce(handleHeaderOnScroll, 10));
    window.addEventListener('resize', debounce(handleHeaderOnScroll, 100));
    handleHeaderOnScroll();
    // منع تأخير اللمس
    document.addEventListener('touchstart', function() {}, {passive: true});
    // بدء التحديث التلقائي
    startAutoUpdate();

    // مزامنة المفضلة عند تسجيل الدخول
    setupFavoritesAuthSync();
    // تحميل العروض اليومية مع تأخير وتحقق من جاهزية Firebase
    setTimeout(() => {
        try {
            console.log('بدء تحميل العروض اليومية بعد التأخير...');
            renderDailyOffers();
        } catch (error) {
            console.warn('خطأ في تحميل العروض اليومية:', error);
        }
    }, 1000); // تقليل التأخير من 2000 إلى 1000
    
    // استدعاء فوري للاختبار
    setTimeout(() => {
        try {
            console.log('استدعاء إضافي لتحميل العروض...');
            renderDailyOffers();
        } catch (error) {
            console.warn('خطأ في الاستدعاء الإضافي:', error);
        }
    }, 3000);
});

// ================================
// 7. جلب وعرض العروض اليومية
// ================================
// جلب العروض اليومية من Google Sheets
// ================================
// 7.1. جلب العروض اليومية من Firestore (لوحة التحكم)
// ================================
async function fetchDailyOffersFromFirestore() {
    try {
        // قراءة العروض من Collection (offers) بشرط active == true
        // ملاحظة: هذه القراءة تعتمد على Firestore Rules
        if (!window.firebase || !window.firebaseFirestore) {
            throw new Error('Firebase Firestore غير مهيأ.');
        }
        
        const db = window.firebase.firestore();
        const offersCol = window.firebaseFirestore.collection(db, 'offers');
        
        // تعديل الاستعلام - إزالة شرط type لأنه قد لا يكون موجوداً
        const q = window.firebaseFirestore.query(
            offersCol,
            window.firebaseFirestore.where('active', '==', true)
        );
        const offersSnapshot = await window.firebaseFirestore.getDocs(q);
        
        const offersList = offersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || data.title || '',
                image: data.image || '',
                price: parseFloat(data.price) || parseFloat(data.discountPrice) || 0,
                weight: data.hasWeightOptions || false,
                type: data.type || 'daily' // افتراض العرض اليومي
            };
        });

        console.log(`تم تحميل ${offersList.length} عرض من Firestore بنجاح`);
        console.log('العروض المحملة:', offersList);
        return offersList;
    } catch (error) {
        console.error('خطأ في جلب العروض من Firestore:', error);
        
        // إضافة عروض تجريبية للاختبار
        console.log('استخدام عروض تجريبية للاختبار');
        return [
            {
                id: 'demo-1',
                name: 'عرض خاص: تشكيلة الفواكه',
                image: 'https://via.placeholder.com/240x180/ff9800/ffffff?text=Fruits+Offer',
                price: 89.99,
                weight: false,
                type: 'daily'
            },
            {
                id: 'demo-2', 
                name: 'خصم على الخضروات الطازجة',
                image: 'https://via.placeholder.com/240x180/4caf50/ffffff?text=Vegetables+Offer',
                price: 45.50,
                weight: false,
                type: 'daily'
            },
            {
                id: 'demo-3',
                name: 'عروض العصائر الطبيعية',
                image: 'https://via.placeholder.com/240x180/2196f3/ffffff?text=Juice+Offer',
                price: 25.00,
                weight: false,
                type: 'daily'
            }
        ];
    }
}

// ================================
// 7.2. جلب العروض اليومية من Google Sheets (احتياطي)
// ================================
async function fetchDailyOffersFromSheet() {
    try {
        const url = '';
        const res = await fetch(url);
        const csv = await res.text();
        const lines = csv.split('\n').filter(line => line.trim().length > 0);
        const header = lines[0].split(',');
        const data = lines.slice(1).map(line => line.split(','));
        // تحويل البيانات لكائنات عروض
        return data.map(cols => {
            while (cols.length > header.length) {
                cols[header.length - 1] += ',' + cols.pop();
            }
            const [id, name, image, price, weight] = cols;
            return {
                id: id ? Number(id) : undefined,
                name: name || '',
                image: image && image.startsWith('http') ? image : '',
                price: price ? Number(price) : '',
                weight: weight || ''
            };
        }).filter(offer => offer.name);
    } catch (error) {
        console.error('خطأ في جلب العروض من Google Sheets:', error);
        return [];
    }
}

// عرض العروض اليومية
async function renderDailyOffers() {
    // رسم العروض اليومية داخل الحاوية #daily-offers-container
    // مصدر البيانات:
    // 1) Firestore (لوحة التحكم)
    // 2) Google Sheets (احتياطي)
    // 3) عروض تجريبية محلية عند عدم وجود بيانات
    const dailyOffersContainer = document.getElementById('daily-offers-container');
    if (!dailyOffersContainer) {
        console.warn('حاوية العروض اليومية غير موجودة');
        return;
    }
    
    console.log('بدء تحميل العروض اليومية...');
    
    // إنشاء عنصر التحميل بشكل آمن
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-spinner';
    const spinnerIcon = document.createElement('i');
    spinnerIcon.className = 'fas fa-spinner fa-spin';
    const loadingText = document.createElement('span');
    loadingText.textContent = 'جاري تحميل العروض اليومية...';
    loadingDiv.appendChild(spinnerIcon);
    loadingDiv.appendChild(loadingText);
    
    dailyOffersContainer.innerHTML = '';
    dailyOffersContainer.appendChild(loadingDiv);
    
    try {
        // محاولة جلب العروض من Firestore أولاً (لوحة التحكم)
        let dailyOffers = [];
        try {
            dailyOffers = await fetchDailyOffersFromFirestore();
            console.log('✅ تم تحميل العروض من Firestore (لوحة التحكم)');
        } catch (firestoreError) {
            console.warn('⚠️ فشل تحميل العروض من Firestore، جارٍ المحاولة من Google Sheets:', firestoreError);
            // في حالة الفشل، استخدم Google Sheets كبديل احتياطي
            dailyOffers = await fetchDailyOffersFromSheet();
            console.log('✅ تم تحميل العروض من Google Sheets (احتياطي)');
        }
        
        dailyOffersContainer.innerHTML = '';
        console.log(`عدد العروض المتاحة: ${dailyOffers.length}`);
        
        if (dailyOffers.length === 0) {
            console.log('لا توجد عروض من المصدر، استخدام 3 عروض تجريبية للاختبار المحلي');
            dailyOffers = [
                {
                    id: 'demo-o-1',
                    name: 'عرض فواكه مشكلة',
                    image: 'https://via.placeholder.com/240x180/ff9800/ffffff?text=Fruit+Mix',
                    price: 89.99,
                    weight: false,
                    type: 'daily'
                },
                {
                    id: 'demo-o-2',
                    name: 'خصم الخضروات الطازجة',
                    image: 'https://via.placeholder.com/240x180/4caf50/ffffff?text=Fresh+Veg',
                    price: 45.50,
                    weight: false,
                    type: 'daily'
                },
                {
                    id: 'demo-o-3',
                    name: 'عروض العصائر',
                    image: 'https://via.placeholder.com/240x180/2196f3/ffffff?text=Juice',
                    price: 25.00,
                    weight: false,
                    type: 'daily'
                }
            ];
        }
        
        dailyOffers.forEach((offer, index) => {
            console.log(`عرض ${index + 1}:`, offer);
            
            const offerDiv = document.createElement('div');
            offerDiv.className = 'daily-offer';
            
            // تحقق من وجود خيارات وزن
            const hasWeightOptions = offer.weight && (
                offer.weight.trim() === '✓' ||
                offer.weight.trim() === 'صح' ||
                offer.weight.trim() === '1' ||
                offer.weight.trim().toLowerCase() === 'true'
            );
            
            // إضافة الصورة إذا وجدت
            if (offer.image) {
                const img = document.createElement('img');
                img.src = offer.image;
                img.alt = offer.name;
                img.onerror = function() {
                    this.src = 'https://via.placeholder.com/240x180/e0e0e0/666666?text=No+Image';
                };
                offerDiv.appendChild(img);
            }
            
            // إضافة العنوان
            const titleDiv = document.createElement('div');
            titleDiv.className = 'daily-offer-title';
            titleDiv.textContent = offer.name;
            offerDiv.appendChild(titleDiv);
            
            // السعر الأساسي - تم نقل خيارات الوزن إلى النظام الجديد
            const priceDiv = document.createElement('div');
            priceDiv.className = 'daily-offer-price';
            priceDiv.textContent = `${offer.price} ج.م`;
            
            // إضافة السعر الأصلي إذا كان هناك خصم
            if (offer.originalPrice && offer.originalPrice > offer.price) {
                priceDiv.setAttribute('data-original-price', `${offer.originalPrice} ج.م`);
            }
            
            offerDiv.appendChild(priceDiv);
            
            // إضافة زر الإضافة للسلة
            const addButton = document.createElement('button');
            addButton.className = 'add-to-cart';
            addButton.setAttribute('data-id', `daily-${offer.id}`);
            addButton.setAttribute('data-offer', 'true');
            addButton.textContent = 'إضافة للسلة';
            offerDiv.appendChild(addButton);
            
            dailyOffersContainer.appendChild(offerDiv);
        });
        
        console.log(`تم عرض ${dailyOffers.length} عرض بنجاح`);
        
        // ربط زر الإضافة للسلة
        dailyOffersContainer.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', function(e) {
                addDailyOfferToCart(e, dailyOffers);
            });
        });
        
    } catch (err) {
        console.error('فشل تحميل العروض اليومية:', err);
        const errorText = document.createElement('p');
        errorText.className = 'no-products';
        errorText.style.textAlign = 'center';
        errorText.style.color = '#e74c3c';
        errorText.style.fontSize = '1.1rem';
        errorText.textContent = 'حدث خطأ أثناء تحميل العروض اليومية.';
        dailyOffersContainer.innerHTML = '';
        dailyOffersContainer.appendChild(errorText);
    }
}

// إضافة عرض يومي للسلة
function addDailyOfferToCart(e, dailyOffers) {
    const btn = e.target;
    const offerId = btn.getAttribute('data-id');
    const idNum = offerId.replace('daily-', '');
    const offer = dailyOffers.find(o => String(o.id) === idNum);
    if (!offer) return;
    let selectedWeight = 1;
    let selectedPrice = offer.price;
    // تم حذف نظام الوزن القديم - الآن يستخدم النظام الجديد
    // تحقق من وجود العنصر في السلة
    const existingItem = cart.find(item => String(item.id) === offerId && Number(item.selectedWeight) === Number(selectedWeight));
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: offerId,
            name: offer.name,
            price: Number(selectedPrice),
            image: offer.image,
            quantity: 1,
            selectedWeight: selectedWeight
        });
    }
    updateCart();
    // إشعار إضافة
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = `تمت إضافة ${offer.name} إلى السلة`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.classList.add('show'); }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => { document.body.removeChild(notification); }, 300);
    }, 2000);
}

// ================================
// 8. إعداد الأحداث الرئيسية
// ================================
function setupEventListeners() {
    // ربط أحداث الواجهة مرة واحدة:
    // - الفلترة/البحث
    // - إضافة إلى السلة (delegation)
    // - فتح/إغلاق السلة
    // فلترة المنتجات حسب الفئة
    categoryFilter.addEventListener('change', filterProducts);
    // البحث
    searchInput.addEventListener('input', debounce(filterProducts, 150));
    // ربط إضافة للسلة مرة واحدة (بدون إعادة ربط عند كل عرض للمنتجات)
    if (productContainer) {
        productContainer.addEventListener('click', (e) => {
            const favBtn = e.target && e.target.closest ? e.target.closest('.favorite-btn') : null;
            if (favBtn) {
                e.preventDefault();
                const id = favBtn.getAttribute('data-id');
                if (id) toggleFavorite(id);
                return;
            }
            const btn = e.target && e.target.closest ? e.target.closest('.add-to-cart') : null;
            if (!btn) return;
            addToCart({ target: btn });
        });
    }
    // فتح السلة عبر المودال فقط إذا كان الرابط '#'
    const cartIconDesktop = document.getElementById('cart-icon-desktop');
    const cartIconMobile = document.getElementById('cart-icon-mobile');
    if (cartIconDesktop && cartIconDesktop.getAttribute('href') === '#') {
        cartIconDesktop.addEventListener('click', (e) => { e.preventDefault(); openCartModal(); });
    }
    if (cartIconMobile && cartIconMobile.getAttribute('href') === '#') {
        cartIconMobile.addEventListener('click', (e) => { e.preventDefault(); openCartModal(); });
    }
    // إغلاق السلة
    closeBtn.addEventListener('click', () => { cartModal.style.display = 'none'; });
    // إغلاق السلة عند الضغط خارجها
    window.addEventListener('click', (e) => { if (e.target === cartModal) { cartModal.style.display = 'none'; } });
    // إتمام الشراء
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('سلة التسوق فارغة!');
            return;
        }
        const user = getCurrentUser();
        if (!user) {
            redirectToLoginForCheckout();
            return;
        }
        sendOrderToWhatsApp();
    });
    // إرسال نموذج التواصل
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = contactForm.querySelector('input[placeholder="الاسم"]').value.trim();
            const email = contactForm.querySelector('input[placeholder="البريد الإلكتروني"]').value.trim();
            const message = contactForm.querySelector('textarea[placeholder="رسالتك"]').value.trim();
            let text = 'رسالة دعم/مشكلة من الموقع:';
            if (name) text += `\nالاسم: ${name}`;
            if (email) text += `\nالبريد: ${email}`;
            if (message) text += `\nالرسالة: ${message}`;
            const encoded = encodeURIComponent(text);
            const phone = (window.APP_SETTINGS && window.APP_SETTINGS.WHATSAPP_PHONE) || '201013449050';
            const wa = `https://wa.me/${phone}?text=${encoded}`;
            const win = window.open(wa, '_blank', 'noopener');
            if (win) { win.opener = null; }
            contactForm.reset();
        });
    }

    function renderFooterPhonesFromSettings() {
        try {
            const footerPhones = document.getElementById('footer-phones');
            const S = window.APP_SETTINGS || {};
            const numbers = Array.isArray(S.CONTACT_PHONES) ? S.CONTACT_PHONES : [];
            const whatsapp = S.WHATSAPP_PHONE || '201013449050';
            if (footerPhones) {
                footerPhones.innerHTML = '';
                if (numbers.length) {
                    numbers.forEach((num) => {
                        const p = document.createElement('p');
                        const icon = document.createElement('i');
                        icon.setAttribute('data-lucide', 'phone');
                        p.appendChild(icon);
                        p.appendChild(document.createTextNode(' '));
                        const a = document.createElement('a');
                        a.href = `https://wa.me/${whatsapp}`;
                        a.target = '_blank';
                        a.rel = 'noopener';
                        a.className = 'phone-link';
                        a.textContent = num;
                        p.appendChild(a);
                        footerPhones.appendChild(p);
                    });
                }
                if (window.lucide) { lucide.createIcons(); }
            }
        } catch (e) { /* noop */ }
    }

    renderFooterPhonesFromSettings();
    try {
        window.addEventListener('appSettingsUpdated', () => {
            renderFooterPhonesFromSettings();
        });
    } catch (e) {}
    // تمرير ناعم للروابط
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            if (mainMenu.classList.contains('active')) {
                mainMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
                const backdrop = document.querySelector('.backdrop');
                if (backdrop) {
                    backdrop.classList.remove('active');
                    backdrop.style.opacity = '0';
                    setTimeout(() => { backdrop.style.display = 'none'; }, 300);
                }
            }
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({ top: targetElement.offsetTop - 70, behavior: 'smooth' });
                    document.querySelectorAll('.main-menu a').forEach(item => { item.classList.remove('active'); });
                    this.classList.add('active');
                }
            }
        });
    });
    // تحديث العنصر النشط في القائمة عند التمرير
    window.addEventListener('scroll', debounce(setActiveNavItem, 200));
}

// ================================
// 9. قائمة الجوال (الهامبرجر)
// ================================
function handleMobileMenu() {
    const menuToggle = document.querySelector('.main-menu-toggle');
    const mainMenu = document.querySelector('.main-menu');
    const backdrop = document.querySelector('.backdrop') || createBackdrop();
    if (!menuToggle || !mainMenu) { console.error('Mobile menu elements not found'); return; }
    menuToggle.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        mainMenu.classList.toggle('active');
        backdrop.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        if (backdrop.classList.contains('active')) {
            backdrop.style.display = 'block'; backdrop.offsetHeight; backdrop.style.opacity = '1';
        } else {
            backdrop.style.opacity = '0';
            setTimeout(() => { if (!backdrop.classList.contains('active')) { backdrop.style.display = 'none'; } }, 300);
        }
    });
    backdrop.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        mainMenu.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.classList.remove('menu-open');
        backdrop.style.opacity = '0';
        setTimeout(() => { backdrop.style.display = 'none'; }, 300);
    });
    // إغلاق القائمة عند الضغط على الروابط
    const menuLinks = document.querySelectorAll('.main-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mainMenu.classList.remove('active');
            backdrop.classList.remove('active');
            document.body.classList.remove('menu-open');
            backdrop.style.opacity = '0';
            setTimeout(() => { backdrop.style.display = 'none'; }, 300);
        });
    });
}

function createBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.classList.add('backdrop');
    document.body.appendChild(backdrop);
    return backdrop;
}

// ================================
// 10. تفعيل العنصر النشط في القائمة
// ================================
function setActiveNavItem() {
    const scrollPosition = window.scrollY + 80;
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            document.querySelectorAll('.main-menu a').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href') === `#${sectionId}`) {
                    item.classList.add('active');
                }
            });
        }
    });
    if (scrollPosition < 100) {
        document.querySelectorAll('.main-menu a').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === '#home') {
                item.classList.add('active');
            }
        });
    }
}

// ================================
// 11. دالة Debounce
// ================================
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => { func.apply(context, args); }, wait);
    };
}

function normalizeArabic(text) {
    // توحيد النص العربي للبحث (إزالة التشكيل وتوحيد الحروف الشائعة)
    return String(text || '')
        .normalize('NFKD')
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

// ================================
// 12. عرض المنتجات مع الصفحات
// ================================
function displayProducts(productsArray) {
    // عرض المنتجات في الصفحة مع التقسيم لصفحات (Pagination)
    // هذه الدالة مسؤولة عن بناء كروت المنتجات داخل #product-container
    currentProducts = productsArray;
    totalPages = Math.ceil(productsArray.length / productsPerPage);
    if (currentPage > totalPages) { currentPage = totalPages || 1; }
    productContainer.innerHTML = '';
    
    if (productsArray.length === 0) {
        const noProductsText = document.createElement('p');
        noProductsText.className = 'no-products';
        noProductsText.textContent = 'لا توجد منتجات متطابقة مع البحث';
        productContainer.appendChild(noProductsText);
        return;
    }
    
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = Math.min(startIndex + productsPerPage, productsArray.length);
    const currentPageProducts = productsArray.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment();
    
    currentPageProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.classList.add('product');
        productElement.setAttribute('data-product-id', product.id);

        // زر المفضلة
        const favBtn = document.createElement('button');
        favBtn.className = 'favorite-btn';
        favBtn.setAttribute('type', 'button');
        favBtn.setAttribute('data-id', product.id);
        favBtn.setAttribute('aria-label', 'إضافة إلى المفضلة');
        const favIcon = document.createElement('i');
        favIcon.className = isFavorite(product.id) ? 'fas fa-heart' : 'far fa-heart';
        favBtn.appendChild(favIcon);
        if (isFavorite(product.id)) {
            favBtn.classList.add('is-favorite');
        }
        productElement.appendChild(favBtn);
        
        // إنشاء الصورة
        const img = document.createElement('img');
        img.src = product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMDAiIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjIjgwIj48L3RleHQ+PC9yZWN0Pjwvc3ZnPg==';
        img.alt = product.name;
        img.loading = 'lazy';
        img.width = 200;
        img.height = 200;
        
        // معالجة أخطاء الصور
        img.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMDAiIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjIjgwIj48L3RleHQ+PC9yZWN0Pjwvc3ZnPg==';
            this.alt = 'صورة افتراضية';
        };
        
        productElement.appendChild(img);
        
        // إنشاء معلومات المنتج
        const productInfo = document.createElement('div');
        productInfo.className = 'product-info';
        
        // عنوان المنتج
        const title = document.createElement('h3');
        title.className = 'product-title';
        title.textContent = product.name;
        productInfo.appendChild(title);

        // عرض الوصف إذا كان موجوداً
        if (product.description && product.description.trim()) {
            const description = document.createElement('p');
            description.className = 'product-description';
            description.textContent = product.description;
            productInfo.appendChild(description);
        }

        // إظهار شارة "غير متوفر" فقط عند نفاد المخزون (بدون إظهار "متوفر")
        if (product.stock === false) {
            const stockStatus = document.createElement('div');
            stockStatus.className = 'stock-badge out-of-stock';
            stockStatus.textContent = 'غير متوفر';
            productElement.appendChild(stockStatus);
        }

        // عناصر الفوتر (السعر + زر الإضافة)
        const footer = document.createElement('div');
        footer.className = 'product-footer';

        const priceEl = document.createElement('p');
        priceEl.className = 'product-price';

        // زر الإضافة للسلة (على شكل دائرة +)
        const addButton = document.createElement('button');
        addButton.className = 'add-to-cart';
        addButton.setAttribute('data-id', product.id);
        addButton.textContent = '+';
        
        // تعطيل الزر إذا كان المنتج غير متوفر في المخزون
        if (product.stock === false) {
            addButton.disabled = true;
            addButton.classList.add('disabled');
            addButton.title = 'غير متوفر في المخزون';
        }

        // إضافة زر الإضافة أولاً ليظهر على اليمين (RTL) في كل الحالات
        footer.appendChild(addButton);

        // خيارات الوزن - تم نقلها إلى نظام الوزن الجديد
        // الآن يتم التحكم فيها من لوحة التحكم عبر weight-products.js
        
        // السعر الأساسي مع الخصم
        if (product.discountPrice && product.discountPrice < product.price) {
            // إضافة شارة الخصم
            const discountBadge = document.createElement('div');
            discountBadge.className = 'discount-badge';
            const discountPercent = Math.round(((product.price - product.discountPrice) / product.price) * 100);
            discountBadge.textContent = `خصم ${discountPercent}%`;
            productElement.appendChild(discountBadge);
            
            // عرض السعر الأصلي والسعر المخصوم
            const priceContainer = document.createElement('div');
            priceContainer.className = 'price-container';
            
            const originalPrice = document.createElement('span');
            originalPrice.className = 'original-price';
            originalPrice.textContent = `${product.price} ج.م`;
            
            const discountPrice = document.createElement('span');
            discountPrice.className = 'discount-price';
            discountPrice.textContent = `${product.discountPrice} ج.م`;
            
            priceContainer.appendChild(originalPrice);
            priceContainer.appendChild(discountPrice);
            footer.appendChild(priceContainer);
            
            // إضافة كلاس للمنتج للتنسيق الخاص
            productElement.classList.add('has-discount');
        } else {
            // السعر العادي بدون خصم
            priceEl.textContent = `${product.price} ج.م`;
            footer.appendChild(priceEl);
        }
        productInfo.appendChild(footer);
        productElement.appendChild(productInfo);
        fragment.appendChild(productElement);
    });
    
    productContainer.appendChild(fragment);
    createPaginationControls();
    
    // تهيئة نظام الوزن بعد عرض المنتجات
    if (window.weightProducts) {
        setTimeout(() => {
            try {
                // نظام الوزن يحتاج عناصر المنتجات تكون مرسومة في DOM أولاً
                window.weightProducts.initializeProducts();
            } catch (e) { /* noop */ }
        }, 250);
    }
    
    // إرسال حدث لتحديث المنتجات
    const event = new CustomEvent('productsUpdated');
    document.dispatchEvent(event);
}

// ================================
// 13. تحكم الصفحات
// ================================
function createPaginationControls() {
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) { existingPagination.remove(); }
    if (totalPages <= 1) { return; }
    
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    // زر السابق
    const prevButton = document.createElement('button');
    const prevIcon = document.createElement('i');
    prevIcon.className = 'fas fa-chevron-right';
    prevButton.appendChild(prevIcon);
    prevButton.classList.add('pagination-btn', 'prev');
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayProducts(currentProducts);
            window.scrollTo({ top: document.getElementById('products').offsetTop - 80, behavior: 'smooth' });
        }
    });
    
    // زر التالي
    const nextButton = document.createElement('button');
    const nextIcon = document.createElement('i');
    nextIcon.className = 'fas fa-chevron-left';
    nextButton.appendChild(nextIcon);
    nextButton.classList.add('pagination-btn', 'next');
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayProducts(currentProducts);
            window.scrollTo({ top: document.getElementById('products').offsetTop - 80, behavior: 'smooth' });
        }
    });
    
    // مؤشر الصفحات
    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    pageIndicator.className = 'page-indicator';
    
    pagination.appendChild(prevButton);
    pagination.appendChild(pageIndicator);
    pagination.appendChild(nextButton);
    productContainer.after(pagination);
}

// ================================
// 14. فلترة المنتجات
// ================================
function filterProducts() {
    const category = categoryFilter.value.trim().toLowerCase();
    const searchTerm = normalizeArabic(searchInput.value);
    let filteredProducts = products;
    
    // فلترة حسب الفئة
    if (category !== 'all') {
        // البحث عن التصنيف المحدد للحصول على التسمية العربية
        const selectedCategoryObject = categories.find(c => c.value === category);
        const categoryLabel = selectedCategoryObject ? normalizeArabic(selectedCategoryObject.label) : '';

        filteredProducts = filteredProducts.filter(product => {
            if (!product.category) return false;
            const productCategory = normalizeArabic(product.category);
            // التحقق من التطابق مع القيمة الإنجليزية أو التسمية العربية
            return productCategory === category || productCategory === categoryLabel;
        });
    }
    
    // فلترة حسب البحث
    if (searchTerm !== '') {
        filteredProducts = filteredProducts.filter(product => 
            normalizeArabic(product.name).includes(searchTerm) ||
            (product.description && normalizeArabic(product.description).includes(searchTerm)) ||
            (product.category && normalizeArabic(product.category).includes(searchTerm))
        );
    }
    
    // فلترة حسب توفر المخزون (اختياري - يمكن إضافته لاحقاً)
    // filteredProducts = filteredProducts.filter(product => product.stock === true);
    
    // تحديث عدد المنتجات المعروضة
    updateFilteredProductsCount(filteredProducts.length);
    
    currentPage = 1;
    displayProducts(filteredProducts);
}

// ================================
// تحديث عدد المنتجات المعروضة
// ================================
function updateFilteredProductsCount(count) {
    const productsHeader = document.querySelector('.products-header h2');
    if (productsHeader) {
        const category = categoryFilter.value;
        if (category === 'all') {
            productsHeader.textContent = `جميع المنتجات (${count})`;
        } else {
            const categoryLabel = categories.find(cat => cat.value === category)?.label || category;
            productsHeader.textContent = `${categoryLabel} (${count})`;
        }
    }
}

// ================================
// 15. إضافة منتج للسلة
// ================================
function addToCart(e) {
    const productId = e.target.getAttribute('data-id');
    const product = products.find(p => String(p.id) === String(productId));
    
    // التحقق من توفر المنتج في المخزون
    if (product.stock === false) {
        const notification = document.createElement('div');
        notification.classList.add('notification', 'error');
        notification.textContent = `${product.name} غير متوفر في المخزون حالياً`;
        document.body.appendChild(notification);
        setTimeout(() => { notification.classList.add('show'); }, 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => { document.body.removeChild(notification); }, 300);
        }, 3000);
        return;
    }
    
    let selectedWeight = 1;
    let selectedPrice = product.price;
    let originalPrice = null;
    
    // التحقق من وجود خصم
    if (product.discountPrice && product.discountPrice < product.price) {
        originalPrice = product.price;
        selectedPrice = product.discountPrice;
    }
    
    // البحث عن وزن من نظام الوزن الجديد
    const card = e.target.closest('.product');
    const weightInput = card ? card.querySelector('.weight-input') : null;
    if (weightInput) {
        selectedWeight = parseFloat(weightInput.value);
        selectedPrice = (selectedPrice * selectedWeight).toFixed(2);
        if (originalPrice) {
            originalPrice = (originalPrice * selectedWeight).toFixed(2);
        }
    }
    
    const existingItem = cart.find(item => String(item.id) === String(productId) && Number(item.selectedWeight) === Number(selectedWeight));
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(selectedPrice),
            originalPrice: originalPrice ? Number(originalPrice) : null,
            image: product.image,
            quantity: 1,
            selectedWeight: selectedWeight,
            hasDiscount: !!originalPrice
        });
    }
    updateCart();
    // إشعار إضافة
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = `تمت إضافة ${product.name} إلى السلة`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.classList.add('show'); }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => { document.body.removeChild(notification); }, 300);
    }, 2000);
}

// ================================
// 16. تحديث السلة
// ================================
function updateCart() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountDesktop = document.getElementById('cart-count-desktop');
    const cartCountMobile = document.getElementById('cart-count-mobile');
    if (cartCountDesktop) cartCountDesktop.textContent = totalItems;
    if (cartCountMobile) cartCountMobile.textContent = totalItems;
    
    cartItems.innerHTML = '';
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.classList.add('cart-item');
        
        // إنشاء الصورة
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.width = 70;
        img.height = 70;
        cartItem.appendChild(img);
        
        // معلومات المنتج
        const cartItemInfo = document.createElement('div');
        cartItemInfo.className = 'cart-item-info';
        
        const title = document.createElement('h4');
        title.className = 'cart-item-title';
        title.textContent = item.name;
        cartItemInfo.appendChild(title);
        
        // عرض الوزن إذا كان المنتج يُباع بالوزن
        if (item.selectedWeight && item.selectedWeight !== 1) {
            const weightInfo = document.createElement('p');
            weightInfo.className = 'cart-item-weight';
            weightInfo.textContent = `الوزن: ${item.selectedWeight} كجم`;
            cartItemInfo.appendChild(weightInfo);
        }
        
        const price = document.createElement('p');
        price.className = 'cart-item-price';
        
        // عرض الخصم في السلة
        if (item.hasDiscount && item.originalPrice) {
            price.classList.add('has-discount');
            const originalPriceEl = document.createElement('span');
            originalPriceEl.className = 'original-price';
            originalPriceEl.textContent = `${item.originalPrice} ج.م`;
            
            const discountPriceEl = document.createElement('span');
            discountPriceEl.className = 'discount-price';
            discountPriceEl.textContent = `${item.price} ج.م`;
            
            price.appendChild(originalPriceEl);
            price.appendChild(discountPriceEl);
        } else {
            price.textContent = `${item.price} ج.م`;
        }
        
        cartItemInfo.appendChild(price);
        
        cartItem.appendChild(cartItemInfo);
        
        // أزرار الكمية
        const quantityDiv = document.createElement('div');
        quantityDiv.className = 'cart-item-quantity';
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'quantity-btn decrease';
        decreaseBtn.setAttribute('data-id', item.id);
        decreaseBtn.textContent = '-';
        quantityDiv.appendChild(decreaseBtn);
        
        const quantitySpan = document.createElement('span');
        quantitySpan.textContent = item.quantity;
        quantityDiv.appendChild(quantitySpan);
        
        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'quantity-btn increase';
        increaseBtn.setAttribute('data-id', item.id);
        increaseBtn.setAttribute('data-weight', item.selectedWeight);
        increaseBtn.textContent = '+';
        quantityDiv.appendChild(increaseBtn);
        
        cartItem.appendChild(quantityDiv);
        
        // زر الحذف
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item';
        removeBtn.setAttribute('data-id', item.id);
        removeBtn.setAttribute('data-weight', item.selectedWeight);
        removeBtn.textContent = '×';
        cartItem.appendChild(removeBtn);
        
        cartItems.appendChild(cartItem);
    });
    
    document.querySelectorAll('.quantity-btn.decrease').forEach(button => { button.addEventListener('click', decreaseQuantity); });
    document.querySelectorAll('.quantity-btn.increase').forEach(button => { button.addEventListener('click', increaseQuantity); });
    document.querySelectorAll('.remove-item').forEach(button => { button.addEventListener('click', removeItem); });
    
    const total = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    totalPrice.textContent = total;
    // حفظ السلة في localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ================================
// 17. فتح نافذة السلة
// ================================
function openCartModal() {
    updateCart();
    cartModal.style.display = 'block';
}

// ================================
// 18. تحكم الكمية في السلة
// ================================
function increaseQuantity(e) {
    const productId = e.target.getAttribute('data-id');
    const selectedWeight = parseFloat(e.target.getAttribute('data-weight'));
    const item = cart.find(item => String(item.id) === String(productId) && Number(item.selectedWeight) === Number(selectedWeight));
    if (item) { item.quantity++; updateCart(); }
}
function decreaseQuantity(e) {
    const productId = e.target.getAttribute('data-id');
    const selectedWeight = parseFloat(e.target.getAttribute('data-weight'));
    const item = cart.find(item => String(item.id) === String(productId) && Number(item.selectedWeight) === Number(selectedWeight));
    if (item) {
        item.quantity--;
        if (item.quantity === 0) {
            cart = cart.filter(item => !(String(item.id) === String(productId) && Number(item.selectedWeight) === Number(selectedWeight)));
        }
        updateCart();
    }
}
function removeItem(e) {
    const productId = e.target.getAttribute('data-id');
    const selectedWeight = parseFloat(e.target.getAttribute('data-weight'));
    cart = cart.filter(item => !(String(item.id) === String(productId) && Number(item.selectedWeight) === Number(selectedWeight)));
    updateCart();
}

// ================================
// 19. تحميل الصور ببطء
// ================================
function lazyLoadImages() {
    if ('loading' in HTMLImageElement.prototype) {
        document.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; });
    } else {
        const lazyImages = document.querySelectorAll('img:not([loading])');
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const image = entry.target;
                        image.src = image.dataset.src || image.src;
                        observer.unobserve(image);
                    }
                });
            });
            lazyImages.forEach(image => {
                if (!image.src && image.dataset.src) {
                    image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                }
                imageObserver.observe(image);
            });
        }
    }
}

// ================================
// 20. تحديث التخطيط عند تغيير الاتجاه
// ================================
function updateLayoutOnOrientationChange() {
    setActiveNavItem();
    if (window.innerWidth <= 768) {
        const productContainer = document.getElementById('product-container');
        if (productContainer) {
            const products = productContainer.querySelectorAll('.product');
            products.forEach(product => {
                product.style.opacity = '0';
                setTimeout(() => { product.style.opacity = '1'; }, 100);
            });
        }
    }
}

// ================================
// 21. إرسال الطلب إلى واتساب وحفظه في Firebase
// ================================
async function sendOrderToWhatsApp() {
    const user = getCurrentUser();
    if (!user) {
        redirectToLoginForCheckout();
        return;
    }
    const deliveryFee = (window.APP_SETTINGS && Number(window.APP_SETTINGS.DELIVERY_FEE)) || 20;
    let orderText = "🛒 *طلب جديد* 🛒\n\n";
    orderText += "📋 *تفاصيل الطلب:*\n";
    cart.forEach((item, index) => {
        orderText += `${index + 1}. ${item.name} (${item.selectedWeight} كجم) - ${item.price} ج.م × ${item.quantity} = ${item.price * item.quantity} ج.م\n`;
    });
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = subtotal + deliveryFee;
    orderText += `\n💰 *المجموع:* ${subtotal} ج.م`;
    orderText += `\n🚚 *التوصيل:* ${deliveryFee} ج.م`;
    orderText += `\n📦 *الإجمالي:* ${grandTotal} ج.م\n\n`;
    orderText += "🙏 يرجى تأكيد الطلب بإرسال عنوان التوصيل ورقم الهاتف";
    
    // حفظ الطلب في Firebase إذا كان المستخدم مسجل دخول
    try {
        if (window.firebase && window.firebase.auth) {
            await saveOrderToFirebase(user.uid, cart, grandTotal);
        }
    } catch (error) {
        console.error('خطأ في حفظ الطلب:', error);
    }
    
    const encodedText = encodeURIComponent(orderText);
    const phoneNumber = (window.APP_SETTINGS && window.APP_SETTINGS.WHATSAPP_PHONE) || "201013449050";
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedText}`;
    const win = window.open(whatsappLink, '_blank', 'noopener');
    if (win) { win.opener = null; }
    cart = [];
    updateCart();
    if (cartModal) { cartModal.style.display = 'none'; }
    alert('تم إرسال طلبك إلى واتساب. شكراً لتسوقك معنا!');
}

// ================================
// 22. حفظ الطلب في Firebase
// ================================
async function saveOrderToFirebase(userId, cartItems, total) {
    try {
        if (window.firebase && window.firebaseFirestore) {
            const db = window.firebase.firestore();
            const now = new Date();

            // تحديث/إنشاء مستند المستخدم في Collection users لصفحة إدارة المستخدمين
            try {
                if (window.firebase.auth) {
                    const auth = window.firebase.auth();
                    const user = auth.currentUser;
                    if (user) {
                        const userRef = window.firebaseFirestore.doc(db, 'users', user.uid);
                        const userSnap = await window.firebaseFirestore.getDoc(userRef);
                        const baseData = {
                            name: user.displayName || null,
                            email: user.email || null,
                            phone: user.phoneNumber || null,
                            active: true,
                            updatedAt: now
                        };
                        if (userSnap.exists()) {
                            await window.firebaseFirestore.updateDoc(userRef, baseData);
                        } else {
                            await window.firebaseFirestore.setDoc(userRef, {
                                ...baseData,
                                createdAt: now
                            });
                        }
                    }
                }
            } catch (userError) {
                console.error('خطأ في تحديث بيانات المستخدم في users:', userError);
            }

            const orderData = {
                // لتوافق كامل مع لوحة التحكم (orders.js + dashboard.js)
                userId: userId,
                customerId: userId,
                items: cartItems,
                total: total,
                status: 'pending',
                createdAt: now,     // تستخدمها لوحة التحكم للترتيب والإحصائيات
                orderDate: now,     // احتفاظ بالاسم القديم للتوافق العكسي
                timestamp: Date.now()
            };
            
            await window.firebaseFirestore.addDoc(
                window.firebaseFirestore.collection(db, 'orders'),
                orderData
            );
            console.log('تم حفظ الطلب في Firebase بنجاح');
        }
    } catch (error) {
        console.error('خطأ في حفظ الطلب في Firebase:', error);
        throw error;
    }
}

// ================================
// 22. تحكم الهيدر عند التمرير
// ================================
function handleHeaderOnScroll() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    if (currentScroll > scrollThreshold) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    if (currentScroll > lastScrollTop && currentScroll > headerHeight) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    lastScrollTop = (currentScroll <= 0) ? 0 : currentScroll;
}

// ================================
// 23. جلب المنتجات من Firestore (لوحة التحكم)
// ================================
async function fetchProductsFromFirestore() {
    try {
        // تأكد من تهيئة Firebase
        if (!window.firebase || !window.firebaseFirestore) {
            throw new Error('Firebase Firestore غير مهيأ.');
        }
        
        const db = window.firebase.firestore();
        const productsCol = window.firebaseFirestore.collection(db, 'products');
        const productsSnapshot = await window.firebaseFirestore.getDocs(productsCol);
        
        const productsList = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            // تحويل البيانات من Firestore إلى تنسيق المتجر
            return {
                // نحتفظ بـ ID النصي كما هو من Firestore ليتوافق مع أزرار السلة
                id: String(doc.id),
                name: data.name || '',
                category: data.category || data.categoryId || '',
                image: data.image || '',
                price: parseFloat(data.price) || 0,
                // نظام الوزن يعتمد على soldByWeight + weight (قيمة افتراضية)
                soldByWeight: data.soldByWeight === true || data.hasWeightOptions === true,
                weight: (typeof data.weight === 'number' ? data.weight : null),
                weightUnit: data.weightUnit || null,
                stock: data.available !== false, // افتراض متوفر إذا لم يحدد
                description: data.description || '',
                hasWeightOptions: data.hasWeightOptions || false,
                discountPrice: data.discountPrice || null
            };
        });

        // ملاحظة: المنتجات التجريبية يتم حقنها في loadProducts() فقط عند عدم وجود أي منتجات

        console.log(`تم تحميل ${productsList.length} منتج من Firestore بنجاح`);
        return productsList;
    } catch (error) {
        console.error('خطأ في جلب المنتجات من Firestore:', error);
        throw error;
    }
}

// ================================
// 23.1. جلب المنتجات من Google Sheets (احتياطي)
// ================================
async function fetchProductsFromSheet() {
    try {
        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrRg0VQSCVD23jU_WyNeMtR2MrXG41Nf5bg7DXrRyX4AFIxnG_Q_-fXldce_rTwAK5ABDKUo6KeUVn/pub?output=csv';
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const csv = await res.text();
        
        if (!csv || csv.trim().length === 0) {
            throw new Error('CSV فارغ أو غير صالح');
        }
        
        const lines = csv.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length < 2) {
            throw new Error('CSV يجب أن يحتوي على رأس وأقل من صف واحد من البيانات');
        }
        
        const header = lines[0].split(',');
        const data = lines.slice(1).map(line => line.split(','));
        const productsMap = {};
        
        data.forEach((cols, index) => {
            try {
                // معالجة الأعمدة التي تحتوي على فواصل
                while (cols.length > header.length) {
                    cols[header.length - 1] += ',' + cols.pop();
                }
                
                const [id, name, category, image, price, weight, stock, description] = cols;
                
                if (!id || !name) return;
                
                // تنظيف وتأكيد صحة البيانات
                const cleanId = String(id).trim();
                const cleanName = String(name).trim();
                const cleanCategory = category ? String(category).trim() : '';
                const cleanImage = image ? String(image).trim() : '';
                const cleanPrice = parseFloat(price) || 0;
                const cleanWeight = weight === 'TRUE' || weight === 'true' || weight === '1' || weight === 'صح' || weight === '✓';
                const cleanStock = stock === 'TRUE' || stock === 'true' || stock === '1' || stock === 'صح' || stock === '✓';
                const cleanDescription = description ? String(description).trim() : '';
                
                if (!productsMap[cleanId]) {
                    productsMap[cleanId] = {
                        id: String(cleanId),
                        name: cleanName,
                        category: cleanCategory,
                        image: cleanImage,
                        price: cleanPrice,
                        soldByWeight: cleanWeight,
                        weight: null,
                        stock: cleanStock,
                        description: cleanDescription,
                        hasWeightOptions: cleanWeight
                    };
                }
            } catch (rowError) {
                console.warn(`خطأ في معالجة الصف ${index + 2}:`, rowError);
            }
        });
        
        const products = Object.values(productsMap);
        
        if (products.length === 0) {
            throw new Error('لم يتم العثور على منتجات صالحة');
        }
        
        console.log(`تم تحميل ${products.length} منتج بنجاح`);
        return products;
        
    } catch (error) {
        console.error('خطأ في جلب البيانات من Google Sheets:', error);
        throw error;
    }
}

// ================================
// 24. تعبئة الفئات في الفلتر
// ================================
function populateCategoryFilter() {
    if (!categoryFilter) return;
    const fragment = document.createDocumentFragment();
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.label;
        fragment.appendChild(option);
    });
    categoryFilter.innerHTML = ''; // مسح الخيارات القديمة
    categoryFilter.appendChild(fragment);

    // عرض أيقونات الفئات
    renderCategoryIcons();
}

// ================================
// عرض أيقونات الفئات (تم نقله إلى settings-sync.js ليكون ديناميكياً)
// ================================
function renderCategoryIcons() {
    // هذه الدالة الآن يتم استدعاؤها من settings-sync.js بعد تحميل الأقسام من لوحة التحكم
    console.log('Category icons will be rendered dynamically from dashboard settings');
}

// ================================
// 25. فلترة المنتجات بالضغط على القسم
// ================================
function filterByCategory(category) {
    categoryFilter.value = category;
    filterProducts();
    
    // التمرير إلى قسم المنتجات
    const productsSection = document.getElementById('products');
    if (productsSection) {
        window.scrollTo({ top: productsSection.offsetTop - 80, behavior: 'smooth' });
    }
    
    // إزالة التحديد من جميع الفئات
    document.querySelectorAll('.category').forEach(cat => { 
        cat.classList.remove('selected'); 
    });
    
    // تحديد الفئة المختارة
    const selectedCategory = document.querySelector(`.category[onclick*="${category}"]`);
    if (selectedCategory) {
        selectedCategory.classList.add('selected');
        setTimeout(() => { selectedCategory.classList.remove('selected'); }, 2000);
    }
    
    // تحديث عنوان الصفحة
    updatePageTitle(category);
}

// ================================
// تحديث عنوان الصفحة حسب الفئة المختارة
// ================================
function updatePageTitle(category) {
    if (category === 'all') {
        document.title = 'الخديوي - جميع المنتجات';
        return;
    }
    
    const categoryLabel = categories.find(cat => cat.value === category)?.label || category;
    document.title = `الخديوي - ${categoryLabel}`;
}

// ================================
// 26. تحميل المنتجات
// ================================
async function loadProducts() {
    // تحميل المنتجات مع كاش محلي لتسريع الأداء:
    // - محاولة استخدام localStorage cache إن كان حديثاً
    // - وإلا: Firestore ثم Sheets
    // - وإذا كانت القائمة فارغة: حقن 3 منتجات تجريبية للاختبار المحلي
    try {
        showLoadingSpinner();
        // تسريع التحميل: استخدم cache من localStorage إذا كان حديثاً
        const cacheKey = 'products_cache';
        const cacheTimeKey = 'products_cache_time';
        const cacheDuration = 5 * 60 * 1000; // 5 دقائق
        let fetchedProducts = null;
        const now = Date.now();
        if (localStorage.getItem(cacheKey) && localStorage.getItem(cacheTimeKey)) {
            const cachedTime = parseInt(localStorage.getItem(cacheTimeKey));
            if (now - cachedTime < cacheDuration) {
                try {
                    fetchedProducts = JSON.parse(localStorage.getItem(cacheKey));
                } catch (e) { fetchedProducts = null; }
            }
        }
        if (!fetchedProducts) {
            // انتظر جاهزية Firebase قبل جلب المنتجات
            try {
                // تحقق من جاهزية Firebase
                if (!window.firebase || !window.firebaseFirestore) {
                    console.warn('Firebase ليس جاهزاً بعد، انتظار 3 ثوانٍ...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
                // محاولة جلب المنتجات من Firestore أولاً (لوحة التحكم)
                try {
                    fetchedProducts = await fetchProductsFromFirestore();
                    console.log('✅ تم تحميل المنتجات من Firestore (لوحة التحكم)');
                } catch (firestoreError) {
                    console.warn('⚠️ فشل تحميل المنتجات من Firestore، جارٍ المحاولة من Google Sheets:', firestoreError);
                    // في حالة الفشل، استخدم Google Sheets كبديل احتياطي
                    try {
                        fetchedProducts = await fetchProductsFromSheet();
                        console.log('✅ تم تحميل المنتجات من Google Sheets (احتياطي)');
                    } catch (sheetError) {
                        console.error('فشل تحميل المنتجات من Google Sheets أيضاً:', sheetError);
                        fetchedProducts = [];
                    }
                }
            } catch (firebaseError) {
                console.error('خطأ في التحقق من جاهزية Firebase:', firebaseError);
                // محاولة استخدام Google Sheets مباشرة
                try {
                    fetchedProducts = await fetchProductsFromSheet();
                    console.log('✅ تم تحميل المنتجات من Google Sheets (مباشر)');
                } catch (sheetError) {
                    console.error('فشل تحميل المنتجات من Google Sheets:', sheetError);
                    fetchedProducts = [];
                }
            }
            localStorage.setItem(cacheKey, JSON.stringify(fetchedProducts));
            localStorage.setItem(cacheTimeKey, now.toString());
        }

        // ضمان وجود بيانات للاختبار المحلي: 3 منتجات وهمية عند عدم وجود منتجات
        if (!Array.isArray(fetchedProducts) || fetchedProducts.length === 0) {
            console.log('استخدام 3 منتجات تجريبية للاختبار المحلي');
            fetchedProducts = [
                {
                    id: 'demo-p-1',
                    name: 'تفاح أحمر',
                    category: 'demo',
                    image: 'https://via.placeholder.com/400x300/ff6b6b/ffffff?text=Apple',
                    price: 50.0,
                    discountPrice: 35.0,
                    soldByWeight: true,
                    stock: true,
                    description: 'تفاح أحمر طازج'
                },
                {
                    id: 'demo-p-2',
                    name: 'طماطم',
                    category: 'demo',
                    image: 'https://via.placeholder.com/400x300/ff5722/ffffff?text=Tomato',
                    price: 25.0,
                    discountPrice: 19.0,
                    soldByWeight: true,
                    stock: true,
                    description: 'طماطم طازجة'
                },
                {
                    id: 'demo-p-3',
                    name: 'مياه معدنية',
                    category: 'demo',
                    image: 'https://via.placeholder.com/400x300/2196f3/ffffff?text=Water',
                    price: 12.0,
                    discountPrice: null,
                    soldByWeight: false,
                    stock: true,
                    description: 'عبوة 1.5 لتر'
                }
            ];
        }
        // Normalize products (especially when coming from old cache)
        products = Array.isArray(fetchedProducts) ? fetchedProducts.map((p) => {
            const soldByWeight = (p && (p.soldByWeight === true || p.hasWeightOptions === true)) || false;
            return {
                ...p,
                id: p && p.id != null ? String(p.id) : '',
                soldByWeight,
                hasWeightOptions: p && p.hasWeightOptions === true ? true : soldByWeight,
                weight: (p && typeof p.weight === 'number') ? p.weight : (p && p.weight === null ? null : null),
                weightUnit: (p && p.weightUnit) ? p.weightUnit : null
            };
        }) : [];

        // إتاحة المنتجات عالميًا حتى يتمكن weight-products.js من قراءة بيانات المنتجات
        window.products = products;
        window.productsArray = products;
        displayProducts(products);
        renderDailyOffers();
        // تحديث الفئات بعد تحميل المنتجات
        setTimeout(() => {
            populateCategoryFilter();
        }, 100);
        hideLoadingSpinner();
        showUpdateNotification('تم تحديث المنتجات بنجاح', 'success');
        
        // إضافة استدعاء لتحميل العروض بعد تحميل المنتجات
        setTimeout(() => {
            try {
                console.log('تحميل العروض بعد تحميل المنتجات...');
                renderDailyOffers();
            } catch (error) {
                console.warn('خطأ في تحميل العروض بعد المنتجات:', error);
            }
        }, 500);
        
    } catch (err) {
        hideLoadingSpinner();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'حدث خطأ أثناء تحميل المنتجات. حاول لاحقاً.';
        productContainer.innerHTML = '';
        productContainer.appendChild(errorDiv);
        console.error('فشل تحميل المنتجات:', err);
        showUpdateNotification('فشل في تحديث المنتجات', 'error');
    }
}

// ================================
// 27. التحديث التلقائي للمنتجات
// ================================
function startAutoUpdate() {
    if (autoUpdateInterval) { clearInterval(autoUpdateInterval); }
    autoUpdateInterval = setInterval(() => { loadProducts(); }, UPDATE_INTERVAL);
    console.log('تم بدء التحديث التلقائي للمنتجات كل 5 دقائق');
}
function stopAutoUpdate() {
    if (autoUpdateInterval) { clearInterval(autoUpdateInterval); autoUpdateInterval = null; console.log('تم إيقاف التحديث التلقائي'); }
}

// ================================
// 28. مؤشر التحميل
// ================================
function showLoadingSpinner() {
    const existingSpinner = document.getElementById('loading-spinner');
    if (!existingSpinner) {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'loading-spinner';
        
        const spinnerIcon = document.createElement('i');
        spinnerIcon.className = 'fas fa-spinner fa-spin';
        spinner.appendChild(spinnerIcon);
        
        const spinnerText = document.createElement('span');
        spinnerText.textContent = 'جاري تحديث المنتجات...';
        spinner.appendChild(spinnerText);
        
        productContainer.appendChild(spinner);
    }
}
function hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) { spinner.remove(); }
}

// ================================
// 29. إشعار التحديث
// ================================
function showUpdateNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.classList.add('update-notification', type);
    
    // إنشاء الأيقونة
    const icon = document.createElement('i');
    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    icon.className = `fas ${iconClass}`;
    notification.appendChild(icon);
    
    // إنشاء النص
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    notification.appendChild(textSpan);
    
    // إنشاء زر الإغلاق
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-notification';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function() {
        this.parentElement.remove();
    });
    notification.appendChild(closeBtn);
    
    document.body.appendChild(notification);
    setTimeout(() => { notification.classList.add('show'); }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => { if (notification.parentElement) { notification.remove(); } }, 300);
    }, 5000);
}

// ================================
// 30. التحديث اليدوي
// ================================
function manualUpdate() {
    // حذف الكاش قبل التحديث
    localStorage.removeItem('products_cache');
    localStorage.removeItem('products_cache_time');
    showUpdateNotification('جاري تحديث المنتجات...', 'info');
    loadProducts();
}

