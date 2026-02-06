// ================================
// ملف التكوين - مفاتيح Firebase
// ================================
// ⚠️ تحذير أمني مهم:
// في الإنتاج، يجب نقل هذه المفاتيح إلى متغيرات بيئية
// أو استخدام قيود على النطاق في Firebase Console
// لا تشارك هذه المفاتيح علناً أو تضعها في مستودعات عامة
// 
// للتأمين:
// 1. إضافة قيود النطاق في Firebase Console
// 2. استخدام متغيرات بيئية (.env)
// 3. إضافة ملف config.js إلى .gitignore
// 4. استخدام Firebase App Check

const firebaseConfig = {
    apiKey: "AIzaSyAWkruoIMbTxD-5DHCpspPY8p2TtZLLmLM",
    authDomain: "dashboard-27bc8.firebaseapp.com",
    projectId: "dashboard-27bc8",
    storageBucket: "dashboard-27bc8.firebasestorage.app",
    messagingSenderId: "707339591256",
    appId: "1:707339591256:web:dcc2649182e97249a2742d",
    measurementId: "G-K8FNNYH4S1"
};

// إعدادات إضافية للموقع
const siteConfig = {
    name: "الخديوي",
    phone: "01013449050",
    whatsapp: "201013449050",
    facebook: "https://www.facebook.com/share/1CizJTdEEc/",
    addresses: [
        "بني سويف - الشرطه العسكريه بجوار مدرسة متولي الشعراوي",
        "بني سويف - شارع بني سويف الجديده - بجوار محل تاون تيم",
        "بني سويف - حي الزهور - بجوار كافيه استكانة"
    ]
};

// تصدير التكوين للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, siteConfig };
} else {
    window.firebaseConfig = firebaseConfig;
    window.siteConfig = siteConfig;
}

