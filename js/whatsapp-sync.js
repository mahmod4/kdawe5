// ================================
// مزامنة إعدادات الواتساب
// ================================

// انتظار جاهزية Firebase
function waitForFirebase(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function checkFirebase() {
            if (window.firebase && window.firebaseFirestore) {
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Firebase لم يصبح جاهزاً في الوقت المحدد'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        }
        
        checkFirebase();
    });
}

// جلب رقم الواتساب من الإعدادات
async function fetchWhatsAppNumber() {
    try {
        await waitForFirebase();
        
        const docRef = window.firebaseFirestore.doc(window.firebase.db, 'settings', 'store');
        const docSnap = await window.firebaseFirestore.getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.whatsappNumber || data.storePhone || '';
        }
        
        return '';
    } catch (error) {
        console.warn('خطأ في جلب رقم الواتساب:', error);
        return '';
    }
}

// تحديث روابط الواتساب في الصفحة
async function updateWhatsAppLinks() {
    try {
        const whatsappNumber = await fetchWhatsAppNumber();
        
        if (!whatsappNumber) {
            console.log('لم يتم العثور على رقم واتساب في الإعدادات');
            return;
        }
        
        // تحديث جميع روابط الواتساب
        document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(link => {
            const cleanNumber = whatsappNumber.replace(/[^\d]/g, '');
            const message = encodeURIComponent('مرحباً من المتجر');
            link.href = `https://wa.me/${cleanNumber}?text=${message}`;
        });
        
        // تحديث أزرار الواتساب المخصصة
        document.querySelectorAll('[data-whatsapp-btn]').forEach(btn => {
            const cleanNumber = whatsappNumber.replace(/[^\d]/g, '');
            const message = encodeURIComponent(btn.dataset.message || 'مرحباً من المتجر');
            btn.onclick = () => {
                window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
            };
        });
        
        console.log('✅ تم تحديث روابط الواتساب بنجاح');
        
    } catch (error) {
        console.warn('⚠️ خطأ في تحديث روابط الواتساب:', error);
    }
}

// تهيئة المزامنة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تأخير التحديث لضمان جاهزية كل العناصر
    setTimeout(updateWhatsAppLinks, 2500);
});

// تصدير الدوال
window.updateWhatsAppLinks = updateWhatsAppLinks;
window.fetchWhatsAppNumber = fetchWhatsAppNumber;
