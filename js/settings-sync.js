// ================================
// مزامنة الإعدادات مع المتجر
// هذا الملف مسؤول عن مزامنة إعدادات المتجر من لوحة التحكم إلى واجهة المتجر
// ================================

// انتظار جاهزية Firebase مع تحسين الأداء
// هذه الدالة تنتظر حتى تصبح جميع مكتبات Firebase جاهزة للاستخدام
function waitForFirebase(timeout = 15000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now(); // تسجيل وقت البدء للتحقق من المهلة
        
        // دالة داخلية للتحقق المستمر من جاهزية Firebase
        function checkFirebase() {
            // التحقق من وجود جميع مكتبات Firebase المطلوبة
            if (window.firebase && window.firebaseFirestore && window.firebase.auth) {
                console.log('✅ Firebase أصبح جاهزاً'); // رسالة نجاح
                resolve(true); // Firebase جاهز - نرجع true
            } else if (Date.now() - startTime > timeout) {
                // تجاوز الوقت المحدد للانتظار
                console.warn('⏰ Firebase لم يصبح جاهزاً في الوقت المحدد، استخدام الإعدادات المحلية');
                resolve(false); // نرجع false بدلاً من reject للتعامل معه بشكل أفضل
            } else {
                // إعادة المحاولة بعد فترة وجيزة
                setTimeout(checkFirebase, 200); // تحقق كل 200ms بدلاً من 100ms لتقليل الحمل على المعالج
            }
        }
        
        checkFirebase(); // بدء عملية التحقق
    });
}

// جلب الإعدادات من Firestore
// هذه الدالة مسؤولة عن جلب إعدادات المتجر من قاعدة البيانات
async function fetchSettingsFromFirestore() {
    try {
        // انتظر حتى يصبح Firebase جاهزاً
        const isReady = await waitForFirebase();
        if (!isReady) {
            console.warn('⚠️ Firebase ليس جاهزاً، استخدام الإعدادات المحلية');
            return {}; // إرجاع إعدادات فارغة
        }
        
        // إنشاء مرجع لمستند الإعدادات في Firestore
        const docRef = window.firebaseFirestore.doc(window.firebase.db, 'settings', 'store');
        const docSnap = await window.firebaseFirestore.getDoc(docRef); // جلب المستند
        
        if (docSnap.exists()) {
            console.log('✅ تم جلب الإعدادات من Firestore'); // رسالة نجاح
            return docSnap.data(); // إرجاع بيانات الإعدادات
        } else {
            console.log('ℹ️ لا توجد إعدادات محفوظة، استخدام الإعدادات الافتراضية');
            return {}; // إرجاع إعدادات فارغة
        }
    } catch (error) {
        console.warn('⚠️ خطأ في جلب الإعدادات من Firestore:', error);
        return {}; // إرجاع إعدادات فارغة في حالة الخطأ
    }
}

// تطبيق الإعدادات على واجهة المتجر
// هذه الدالة تأخذ الإعدادات وتطبقها على عناصر الصفحة
async function syncStoreSettings() {
    try {
        // جلب الإعدادات من Firestore
        const settings = await fetchSettingsFromFirestore();
        
        // تحديث اسم المتجر في جميع العناصر التي تحمل خاصية data-store-name
        if (settings.storeName) {
            document.querySelectorAll('[data-store-name]').forEach(el => {
                el.textContent = settings.storeName; // تعيين النص الجديد
            });
        }
        
        // تحديث شعار المتجر في جميع العناصر التي تحمل خاصية data-store-logo
        if (settings.storeLogo) {
            document.querySelectorAll('[data-store-logo]').forEach(el => {
                el.src = settings.storeLogo; // تعيين مصدر الصورة الجديد
                el.alt = settings.storeName || 'المتجر'; // تعيين نص بديل للصورة
            });
        }
        
        // تحديث أيقونة الموقع (favicon) في جميع العناصر التي تحمل خاصية data-store-favicon
        if (settings.storeLogo) {
            document.querySelectorAll('[data-store-favicon]').forEach(el => {
                el.href = settings.storeLogo; // تعيين رابط الأيقونة الجديدة
            });
        }
        
        // تحديث معلومات الاتصال بالمخزن
        if (settings.storePhone) {
            // تحديث جميع روابط الواتساب في الصفحة
            document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(el => {
                const baseUrl = el.href.split('?')[0]; // استخراج الرابط الأساسي
                // إنشاء رابط واتساب جديد مع رقم الهاتف من الإعدادات
                el.href = `${baseUrl}?phone=${settings.storePhone.replace(/[^\d]/g, '')}&text=مرحباً من المتجر`;
            });
        }
        
        console.log('✅ تم مزامنة الإعدادات بنجاح'); // رسالة نجاح
        
    } catch (error) {
        console.warn('⚠️ خطأ في مزامنة الإعدادات:', error); // رسالة خطأ
    }
}

// تهيئة المزامنة عند تحميل الصفحة
// هذا الحدث يشتغل عندما يتم تحميل محتوى الصفحة بالكامل
document.addEventListener('DOMContentLoaded', function() {
    // تأخير المزامنة لمدة ثانيتين لضمان جاهزية كل العناصر الأخرى
    setTimeout(syncStoreSettings, 2000);
});

// تصدير الدوال للاستخدام الخارجي من ملفات أخرى
window.syncStoreSettings = syncStoreSettings; // توفير دالة المزامنة عالمياً
window.fetchSettingsFromFirestore = fetchSettingsFromFirestore; // توفير دالة الجلب عالمياً
