// ================================
// Service Worker لمتجر الشادر للخضروات والفواكه
// Enhanced PWA Support with Offline Capabilities
// ================================

const CACHE_NAME = 'shadar-store-v1';
const OFFLINE_CACHE = 'shadar-offline-v1';
const urlsToCache = [
  '/',
  '/css/styles.css',
  '/js/script.js',
  '/js/ui.js',
  '/js/settings.js',
  '/js/settings-sync.js',
  '/js/whatsapp-sync.js',
  '/js/weight-service.js',
  '/js/weight-cart.js',
  '/js/weight-products.js',
  '/js/favorites.js',
  '/js/runtime-env-client.js',
  '/js/product-image-utils.js',
  '/js/branches-utils.js',
  '/manifest.json',
  '/logo.svg'
];

// Offline page
const offlineUrls = [
  '/',
  '/logo.svg'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: تم التثبيت');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('Service Worker: تم فتح الكاش الرئيسي');
          return cache.addAll(urlsToCache);
        }),
      caches.open(OFFLINE_CACHE)
        .then(cache => {
          console.log('Service Worker: تم فتح الكاش للعمل بدون اتصال');
          return cache.addAll(offlineUrls);
        })
    ])
    .then(() => {
      console.log('✅ Service Worker: تم التثبيت بنجاح');
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('❌ Service Worker: خطأ في التثبيت', error);
    })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: تم التفعيل');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('Service Worker: حذف الكاش القديم', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker: تم التفعيل والتحكم بالعملاء');
      return self.clients.claim();
    })
  );
});

// اعتراض الطلبات
self.addEventListener('fetch', event => {
  // تجاهل طلبات POST وغيرها
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إرجاع من الكاش إذا وجد
        if (response) {
          return response;
        }

        // محاولة جلب من الشبكة
        return fetch(event.request)
          .then(response => {
            // التحقق من أن الاستجابة صالحة
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // نسخ الاستجابة للكاش (للملفات الثابتة فقط)
            const responseToCache = response.clone();
            const url = new URL(event.request.url);
            
            // كاش الملفات الثابتة فقط
            if (url.pathname.startsWith('/css/') || 
                url.pathname.startsWith('/js/') || 
                url.pathname.startsWith('/images/') ||
                url.pathname.endsWith('.svg') ||
                url.pathname.endsWith('.css') ||
                url.pathname.endsWith('.js')) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(() => {
            // إرجاع صفحة بدون اتصال إذا فشل الاتصال
            console.log('Service Worker: فشل الاتصال، محاولة إرجاع صفحة بدون اتصال');
            
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            
            // للأيقونات والصور
            if (event.request.destination === 'image') {
              return caches.match('/logo.svg');
            }
            
            // للملفات الأخرى، إرجاع خطأ مناسب
            return new Response('لا يوجد اتصال بالإنترنت', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            });
          });
      })
  );
});

// معالجة الإشعارات (للمستقبل)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'تحديث جديد في متجر الشادر للخضروات والفواكه!',
    icon: '/logo.svg',
    badge: '/logo.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'استكشف المنتجات',
        icon: '/logo.svg'
      },
      {
        action: 'close',
        title: 'إغلاق',
        icon: '/logo.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('متجر الشادر', options)
  );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/html/index.html#products')
    );
  } else if (event.action === 'close') {
    // إغلاق الإشعار فقط
  } else {
    // النقر على الإشعار الرئيسي
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

