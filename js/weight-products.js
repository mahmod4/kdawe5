// ================================
// إدارة المنتجات مع دعم الوزن
// هذا الملف مسؤول عن جلب وعرض المنتجات مع دعم المنتجات الموزونة والقطعية
// ================================

// انتظار جاهزية Firebase
// هذه الدالة تنتظر حتى تصبح مكتبات Firebase جاهزة للاستخدام
function waitForFirebase(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now(); // تسجيل وقت البدء
        
        // دالة داخلية للتحقق المستمر من جاهزية Firebase
        function checkFirebase() {
            if (window.firebase && window.firebaseFirestore) {
                resolve(true); // Firebase جاهز
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Firebase لم يصبح جاهزاً في الوقت المحدد')); // تجاوز الوقت
            } else {
                setTimeout(checkFirebase, 100); // إعادة المحاولة بعد 100ms
            }
        }
        
        checkFirebase(); // بدء عملية التحقق
    });
}

// جلب المنتجات من Firestore
// هذه الدالة مسؤولة عن جلب جميع المنتجات من قاعدة البيانات
async function fetchWeightProductsFromFirestore() {
    try {
        await waitForFirebase(); // انتظار جاهزية Firebase
        
        // إنشاء مرجع لمجموعة المنتجات
        const colRef = window.firebaseFirestore.collection(window.firebase.db, 'products');
        const snap = await window.firebaseFirestore.getDocs(colRef); // جلب جميع المستندات
        
        // تحويل المستندات إلى كائنات JavaScript
        const products = snap.docs.map(doc => {
            const data = doc.data(); // جلب بيانات المستند
            return {
                id: doc.id, // معرف المنتج
                name: data.name || '', // اسم المنتج
                price: data.price || 0, // سعر المنتج
                image: data.image || '../images/default-logo.png', // صورة المنتج
                description: data.description || '', // وصف المنتج
                category: data.category || '', // فئة المنتج
                unit: data.unit || 'قطعة', // وحدة القياس
                soldByWeight: data.soldByWeight || data.hasWeightOptions || false, // هل يباع بالوزن؟
                stock: data.stock || 0, // كمية المخزون
                isActive: data.isActive !== false // هل المنتج نشط؟
            };
        }).filter(product => product.isActive && product.name); // تصفية المنتجات النشطة فقط
        
        console.log(`✅ تم تحميل ${products.length} منتج من Firestore`); // رسالة نجاح
        return products; // إرجاع المنتجات
        
    } catch (error) {
        console.warn('⚠️ خطأ في جلب المنتجات من Firestore:', error); // رسالة خطأ
        return []; // إرجاع مصفوفة فارغة في حالة الخطأ
    }
}

// عرض المنتجات في الواجهة
// هذه الدالة تعرض المنتجات في واجهة المستخدم مع دعم المنتجات الموزونة والقطعية
function displayWeightProducts(products) {
    try {
        const container = document.getElementById('product-container'); // الحصول على حاوية المنتجات
        if (!container) return; // الخروج إذا لم يتم العثور على الحاوية
        
        if (products.length === 0) {
            // عرض رسالة عندما لا توجد منتجات
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i> <!-- أيقونة الصندوق الفارغ -->
                    <h3>لا توجد منتجات حالياً</h3> <!-- عنوان الرسالة -->
                    <p>يرجى التحقق لاحقاً</p> <!-- نص الرسالة -->
                </div>
            `;
            return;
        }
        
        // إنشاء عناصر HTML لكل منتج
        container.innerHTML = products.map(product => `
            <div class="product-card" data-category="${product.category}" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" 
                         onerror="this.src='../images/default-logo.png'"> <!-- صورة المنتج مع صورة احتياطية -->
                    ${product.soldByWeight ? '<span class="weight-badge">بالوزن</span>' : ''} <!-- شارة الوزن -->
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3> <!-- اسم المنتج -->
                    <p class="description">${product.description}</p> <!-- وصف المنتج -->
                    <div class="price-info">
                        <span class="price">${product.price}</span> <!-- السعر -->
                        <span class="unit">${product.unit === 'كجم' ? 'ج.م/كجم' : 'ج.م'}</span> <!-- الوحدة -->
                    </div>
                    ${product.stock <= 10 ? '<p class="low-stock">مخزون محدود</p>' : ''} <!-- تحذير المخزون -->
                </div>
                <div class="product-actions">
                    ${product.soldByWeight ? `
                        <!-- عناصر التحكم للمنتجات الموزونة -->
                        <div class="weight-input-group">
                            <input type="number" 
                                   id="weight-${product.id}" // معرف فريد لحقل الوزن
                                   placeholder="الوزن بالكجم" // نص المساعد
                                   step="0.1" // خطوة الزيادة
                                   min="0.1"> // الحد الأدنى
                            <button onclick="addWeightProductToCart('${product.id}')">
                                <i class="fas fa-cart-plus"></i> <!-- أيقونة السلة -->
                                أضف للسلة <!-- نص الزر -->
                            </button>
                        </div>
                    ` : `
                        <!-- عناصر التحكم للمنتجات القطعية -->
                        <div class="quantity-input-group">
                            <input type="number" 
                                   id="quantity-${product.id}" // معرف فريد لحقل الكمية
                                   placeholder="الكمية" // نص المساعد
                                   min="1" // الحد الأدنى
                                   value="1"> // القيمة الافتراضية
                            <button onclick="addProductToCart('${product.id}')">
                                <i class="fas fa-cart-plus"></i> <!-- أيقونة السلة -->
                                أضف للسلة <!-- نص الزر -->
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `).join(''); // دمج جميع عناصر HTML
        
    } catch (error) {
        console.error('خطأ في عرض المنتجات:', error); // رسالة خطأ
    }
}

// إضافة منتج بالوزن للسلة
// هذه الدالة تضيف منتجاً موزوناً للسلة بناءً على الوزن المدخل
function addWeightProductToCart(productId) {
    try {
        const weightInput = document.getElementById(`weight-${productId}`); // الحصول على حقل الوزن
        const weight = parseFloat(weightInput.value); // تحويل القيمة إلى رقم
        
        // التحقق من صحة الوزن المدخل
        if (!weight || weight <= 0) {
            showNotification('يرجى إدخال وزن صحيح', 'error'); // رسالة خطأ
            return;
        }
        
        // البحث عن المنتج في القائمة المعروضة
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (!productCard) {
            showNotification('المنتج غير موجود', 'error'); // رسالة خطأ
            return;
        }
        
        // إنشاء كائن المنتج من بيانات الواجهة
        const product = {
            id: productId, // معرف المنتج
            name: productCard.querySelector('h3').textContent, // اسم المنتج
            price: parseFloat(productCard.querySelector('.price').textContent), // سعر المنتج
            image: productCard.querySelector('img').src, // صورة المنتج
            unit: 'كجم', // وحدة القياس
            soldByWeight: true // يباع بالوزن
        };
        
        // استدعاء دالة إضافة للسلة من ملف weight-cart.js
        if (window.addToCart) {
            window.addToCart(product, 0, weight); // إضافة المنتج مع الوزن
            weightInput.value = ''; // تفريغ حقل الوزن
        } else {
            console.error('دالة addToCart غير موجودة'); // رسالة خطأ
        }
        
    } catch (error) {
        console.error('خطأ في إضافة المنتج بالوزن:', error); // رسالة خطأ مفصلة
        showNotification('خطأ في إضافة المنتج', 'error'); // رسالة خطأ للمستخدم
    }
}

// إضافة منتج عادي للسلة
// هذه الدالة تضيف منتجاً قطعياً للسلة بناءً على الكمية المدخلة
function addProductToCart(productId) {
    try {
        const quantityInput = document.getElementById(`quantity-${productId}`); // الحصول على حقل الكمية
        const quantity = parseInt(quantityInput.value) || 1; // تحويل القيمة إلى رقم مع قيمة افتراضية
        
        // البحث عن المنتج في القائمة المعروضة
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (!productCard) {
            showNotification('المنتج غير موجود', 'error'); // رسالة خطأ
            return;
        }
        
        // إنشاء كائن المنتج من بيانات الواجهة
        const product = {
            id: productId, // معرف المنتج
            name: productCard.querySelector('h3').textContent, // اسم المنتج
            price: parseFloat(productCard.querySelector('.price').textContent), // سعر المنتج
            image: productCard.querySelector('img').src, // صورة المنتج
            unit: 'قطعة', // وحدة القياس
            soldByWeight: false // لا يباع بالوزن
        };
        
        // استدعاء دالة إضافة للسلة من ملف weight-cart.js
        if (window.addToCart) {
            window.addToCart(product, quantity, null); // إضافة المنتج مع الكمية
            quantityInput.value = '1'; // إعادة تعيين الحقل للقيمة الافتراضية
        } else {
            console.error('دالة addToCart غير موجودة'); // رسالة خطأ
        }
        
    } catch (error) {
        console.error('خطأ في إضافة المنتج:', error); // رسالة خطأ مفصلة
        showNotification('خطأ في إضافة المنتج', 'error'); // رسالة خطأ للمستخدم
    }
}

// تحميل المنتجات وعرضها
// هذه الدالة تجلب المنتجات من Firebase وتعرضها في الواجهة
async function loadWeightProducts() {
    try {
        showLoading(true); // إظهار حالة التحميل
        const products = await fetchWeightProductsFromFirestore(); // جلب المنتجات
        displayWeightProducts(products); // عرض المنتجات
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error); // رسالة خطأ مفصلة
        showNotification('خطأ في تحميل المنتجات', 'error'); // رسالة خطأ للمستخدم
    } finally {
        showLoading(false); // إخفاء حالة التحميل
    }
}

// إظهار/إخفاء حالة التحميل
// هذه الدالة تعرض أو تخفي مؤشر التحميل أثناء جلب البيانات
function showLoading(show) {
    try {
        const container = document.getElementById('product-container'); // الحصول على حاوية المنتجات
        if (!container) return; // الخروج إذا لم يتم العثور على الحاوية
        
        if (show) {
            // عرض مؤشر التحميل
            container.innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div> <!-- مؤشر التحميل الدوار -->
                    <p>جاري تحميل المنتجات...</p> <!-- نص التحميل -->
                </div>
            `;
        }
    } catch (error) {
        console.error('خطأ في عرض حالة التحميل:', error); // رسالة خطأ
    }
}

// إظهار الإشعارات
// هذه الدالة تعرض إشعارات للمستخدم مع دعم استخدام دالة موجودة
function showNotification(message, type = 'info') {
    try {
        // التحقق من وجود دالة إشعارات عالمية
        if (window.showNotification) {
            window.showNotification(message, type); // استخدام الدالة الموجودة
            return;
        }
        
        // إنشاء إشعار جديد إذا لم توجد دالة
        const notification = document.createElement('div');
        notification.className = `notification ${type}`; // إضافة الفئة حسب النوع
        notification.textContent = message; // نص الرسالة
        
        // تنسيق الإشعار باستخدام CSS
        notification.style.cssText = `
            position: fixed; // تثبيت الإشعار
            top: 20px; // المسافة من الأعلى
            left: 50%; // توسيط أفقي
            transform: translateX(-50%); // تعديل التوسيط
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'}; // اللون حسب النوع
            color: white; // لون النص
            padding: 12px 24px; // الحشو الداخلي
            border-radius: 8px; // زوايا دائرية
            z-index: 10000; // أعلى طبقة
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); // الظل
        `;
        
        document.body.appendChild(notification); // إضافة الإشعار للصفحة
        
        // إزالة الإشعار بعد 3 ثواني
        setTimeout(() => {
            notification.remove(); // حذف الإشعار
        }, 3000);
        
    } catch (error) {
        console.error('خطأ في إظهار الإشعار:', error); // رسالة خطأ
    }
}

// تهيئة عند تحميل الصفحة
// هذا الحدث يضمن بدء تحميل المنتجات بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تأخير تحميل المنتجات لضمان جاهزية Firebase
    setTimeout(loadWeightProducts, 3000); // انتظار 3 ثواني قبل التحميل
});

// تصدير الدوال للاستخدام الخارجي
// هذه الدوال تصدر لتكون متاحة للاستخدام من ملفات JavaScript أخرى
window.addWeightProductToCart = addWeightProductToCart; // دالة إضافة منتج بالوزن
window.addProductToCart = addProductToCart; // دالة إضافة منتج عادي
window.loadWeightProducts = loadWeightProducts; // دالة تحميل المنتجات
