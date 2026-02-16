// ================================
// Service Worker للـ PWA
// ================================

const CACHE_NAME = 'store-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/settings.js',
    '/js/settings-sync.js',
    '/js/whatsapp-sync.js',
    '/js/weight-cart.js',
    '/js/weight-products.js',
    '/js/script.js',
    '/images/default-logo.png',
    '/images/logo22.png',
    '/manifest.json'
];

// تثبيت Service Worker وتخزين الملفات
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Service Worker: تخزين الملفات');
                return cache.addAll(urlsToCache);
            })
            .catch(function(error) {
                console.error('Service Worker: خطأ في التخزين', error);
            })
    );
});

// تفعيل Service Worker وحذف الكاش القديم
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: حذف الكاش القديم', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// اعتراض طلبات الشبكة
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // إذا كان الطلب موجود في الكاش، استخدمه
                if (response) {
                    console.log('Service Worker: استخدام الكاش', event.request.url);
                    return response;
                }
                
                // وإلا قم بالطلب من الشبكة
                return fetch(event.request)
                    .then(function(response) {
                        // تحقق إذا كان الطلب صالح
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // تخزين الطلب في الكاش للاستخدام المستقبلي
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(function(error) {
                        console.error('Service Worker: خطأ في طلب الشبكة', error);
                        
                        // محاولة إرجاع صفحة خطأ من الكاش
                        return caches.match('/offline.html');
                    });
            })
    );
});

// مزامنة في الخلفية
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-cart') {
        event.waitUntil(syncCart());
    }
});

// مزامنة السلة
async function syncCart() {
    try {
        const cart = await getCartFromIndexedDB();
        if (cart && cart.length > 0) {
            // إرسال السلة للخادم
            await sendCartToServer(cart);
            console.log('Service Worker: تم مزامنة السلة بنجاح');
        }
    } catch (error) {
        console.error('Service Worker: خطأ في مزامنة السلة', error);
    }
}

// الحصول على السلة من IndexedDB
function getCartFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('storeDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['cart'], 'readonly');
            const store = transaction.objectStore('cart');
            const getAllRequest = store.getAll();
            
            getAllRequest.onerror = () => reject(getAllRequest.error);
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('cart')) {
                db.createObjectStore('cart');
            }
        };
    });
}

// إرسال السلة للخادم
async function sendCartToServer(cart) {
    const response = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart })
    });
    
    if (!response.ok) {
        throw new Error('فشل في مزامنة السلة');
    }
    
    return response.json();
}

// معالجة الإشعارات
self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : 'إشعار جديد',
        icon: '/images/logo-192.png',
        badge: '/images/logo-96.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'استعراض',
                icon: '/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/images/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('المتجر', options)
    );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('Service Worker: تم التحميل بنجاح');
