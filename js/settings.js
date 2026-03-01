// ================================
// أسواق الخديوي - ملف الإعدادات العامة
// ================================
// هذا الملف يحتوي على جميع الإعدادات العامة للموقع:
// - رسوم التوصيل
// - أرقام الهاتف والواتساب
// - فئات المنتجات
// - إعدادات أخرى
// ================================

// إعدادات عامة للتطبيق (نقطة تحكم واحدة)
// القيم الافتراضية (يتم استبدالها بما في Firestore إن وجد)
window.APP_SETTINGS = {
  // ================================
  // إعدادات التوصيل والدفع
  // ================================
  DELIVERY_FEE: 10, // سيتم استبدالها بـ shippingBaseCost من لوحة التحكم

  // ================================
  // إعدادات التواصل
  // ================================
  WHATSAPP_PHONE: '201013449050', // سيتم استبدالها بـ socialWhatsapp من لوحة التحكم (بدون +)
  CONTACT_PHONES: ['201013449050'], // سيتم استبدالها برقم/أرقام الهاتف من لوحة التحكم
  CONTACT_NAME: '', // سيتم استبدالها من لوحة التحكم
  CONTACT_EMAIL: '', // سيتم استبدالها من لوحة التحكم
  CONTACT_MESSAGE: '', // سيتم استبدالها من لوحة التحكم

  // ================================
  // بيانات العميل الافتراضية (تُدار من لوحة التحكم)
  // ================================
  DEFAULT_CUSTOMER_FIRST_NAME: '',
  DEFAULT_CUSTOMER_LAST_NAME: '',
  DEFAULT_CUSTOMER_ADDRESS: '',
  DEFAULT_CUSTOMER_PHONE: '',

  CUSTOMER_FIELDS: [
    { label: 'الاسم الأول', type: 'text', required: true, defaultValue: '' },
    { label: 'الاسم الثاني', type: 'text', required: true, defaultValue: '' },
    { label: 'العنوان', type: 'text', required: true, defaultValue: '' },
    { label: 'رقم الهاتف', type: 'tel', required: true, defaultValue: '' }
  ],

  // ================================
  // فئات المنتجات (احتياطي فقط، الفئات الأساسية تأتي من Firestore)
  // ================================
  CATEGORIES: [
    { key: 'dairy', label: 'الألبان والجبن' },
    { key: 'grocery', label: 'البقالة' },
    { key: 'snacks', label: 'Snacks' },
    { key: 'beverages', label: 'المشروبات' },
    { key: 'cleaning', label: 'المنظفات' },
    { key: 'frozen', label: 'المجمدات' },
    { key: 'canned', label: 'المعلبات' }
  ],

  // ================================
  // فروع المتجر (اختياري - غير مستخدم حالياً في الواجهة)
  // ================================
  BRANCHES: []
};

// ================================
// جلب الإعدادات من Firestore (من لوحة التحكم)
// ================================
(async function loadAppSettingsFromFirestore() {
  try {
    const waitForFirebaseReady = async () => {
      const maxAttempts = 60;
      let attempt = 0;
      while (attempt < maxAttempts) {
        if (window.firebase && window.firebaseFirestore && window.firebase.firestore) return true;
        await new Promise((r) => setTimeout(r, 150));
        attempt++;
      }
      return false;
    };

    const ready = await waitForFirebaseReady();
    if (!ready) {
      console.warn('Firebase غير مهيأ بعد، سيتم استخدام القيم الافتراضية في APP_SETTINGS');
      return;
    }

    const db = window.firebase.firestore();

    // قراءة الإعدادات العامة من وثيقة settings/general
    try {
      const generalRef = window.firebaseFirestore.doc(db, 'settings', 'general');
      const generalSnap = await window.firebaseFirestore.getDoc(generalRef);

      if (generalSnap.exists()) {
        const s = generalSnap.data() || {};

        // رسوم التوصيل من لوحة التحكم
        if (typeof s.shippingBaseCost !== 'undefined') {
          window.APP_SETTINGS.DELIVERY_FEE = Number(s.shippingBaseCost) || window.APP_SETTINGS.DELIVERY_FEE;
        }

        // أرقام الهاتف
        const phones = [];
        if (s.storePhone) {
          phones.push(String(s.storePhone));
        }
        if (Array.isArray(s.contactPhones) && s.contactPhones.length) {
          s.contactPhones.forEach(p => phones.push(String(p)));
        }
        if (phones.length) {
          window.APP_SETTINGS.CONTACT_PHONES = phones;
        }

        // واتساب من socialWhatsapp إن وجد، وإلا fallback إلى storePhone
        if (s.socialWhatsapp) {
          const cleaned = String(s.socialWhatsapp).replace(/\s+/g, '').replace(/^\+/, '').replace(/[^0-9]/g, '');
          if (cleaned) window.APP_SETTINGS.WHATSAPP_PHONE = cleaned;
        } else if (s.storePhone) {
          const cleaned = String(s.storePhone).replace(/\s+/g, '').replace(/^\+/, '').replace(/[^0-9]/g, '');
          if (cleaned) window.APP_SETTINGS.WHATSAPP_PHONE = cleaned;
        }

        // بيانات نموذج التواصل
        if (s.contactName) {
          window.APP_SETTINGS.CONTACT_NAME = String(s.contactName);
        }
        if (s.contactEmail) {
          window.APP_SETTINGS.CONTACT_EMAIL = String(s.contactEmail);
        }
        if (s.contactMessage) {
          window.APP_SETTINGS.CONTACT_MESSAGE = String(s.contactMessage);
        }

        // بيانات العميل الافتراضية
        if (s.defaultCustomerFirstName) {
          window.APP_SETTINGS.DEFAULT_CUSTOMER_FIRST_NAME = String(s.defaultCustomerFirstName);
        }
        if (s.defaultCustomerLastName) {
          window.APP_SETTINGS.DEFAULT_CUSTOMER_LAST_NAME = String(s.defaultCustomerLastName);
        }
        if (s.defaultCustomerAddress) {
          window.APP_SETTINGS.DEFAULT_CUSTOMER_ADDRESS = String(s.defaultCustomerAddress);
        }
        if (s.defaultCustomerPhone) {
          window.APP_SETTINGS.DEFAULT_CUSTOMER_PHONE = String(s.defaultCustomerPhone);
        }

        if (Array.isArray(s.customerFields)) {
          window.APP_SETTINGS.CUSTOMER_FIELDS = s.customerFields;
        }

        console.log('تم تحميل APP_SETTINGS من Firestore (settings/general):', window.APP_SETTINGS);
      }
    } catch (error) {
      console.error('خطأ في جلب settings/general من Firestore:', error);
    }

    // يمكن لاحقاً إضافة قراءة إعدادات أخرى (مثل loyalty) إذا احتاج المتجر لها مباشرة
  } catch (e) {
    console.error('خطأ عام في تحميل APP_SETTINGS من Firestore:', e);
  }
})();

