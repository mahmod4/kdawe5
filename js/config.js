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

const __env = (typeof window !== 'undefined' && window.RUNTIME_ENV && typeof window.RUNTIME_ENV === 'object')
    ? window.RUNTIME_ENV
    : {};

const firebaseConfig = {
    apiKey: __env.FIREBASE_API_KEY || "",
    authDomain: __env.FIREBASE_AUTH_DOMAIN || "",
    databaseURL: __env.FIREBASE_DATABASE_URL || "",
    projectId: __env.FIREBASE_PROJECT_ID || "",
    storageBucket: __env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: __env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: __env.FIREBASE_APP_ID || ""
};

// تهيئة Firebase إذا لم يكن مهيأ
if (typeof window !== 'undefined' && !window.firebase) {
    import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js').then(({ initializeApp }) => {
        import('https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js').then(({ getAuth }) => {
            import('https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js').then(({ getFirestore }) => {
                try {
                    const app = initializeApp(firebaseConfig);
                    const auth = getAuth(app);
                    const db = getFirestore(app);
                    
                    // جعل Firebase متاحاً عالمياً مثل اللوحة
                    window.firebase = {
                        app: app,
                        auth: () => auth,
                        firestore: () => db
                    };
                    
                    console.log('✅ تم تهيئة Firebase في المتجر بنفس إعدادات اللوحة');
                } catch (error) {
                    console.error('❌ خطأ في تهيئة Firebase:', error);
                }
            });
        });
    });
}

// إعدادات إضافية للموقع - متجر الشادر للخضروات والفواكه
const siteConfig = {
    name: "الشادر",
    description: "متجر الشادر للخضروات والفواكه الطازجة",
    phone: "", // سيتم جلبه من لوحة التحكم
    whatsapp: "", // سيتم جلبه من لوحة التحكم
    facebook: "", // سيتم جلبه من لوحة التحكم
    addresses: [], // سيتم جلبها من لوحة التحكم
    businessType: "خضروات وفواكه",
    specialties: ["خضروات طازجة", "فواكه موسمية", "منتجات عضوية", "توصيل سريع"]
};

// تصدير التكوين للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, siteConfig };
} else {
    window.firebaseConfig = firebaseConfig;
    window.siteConfig = siteConfig;
}

