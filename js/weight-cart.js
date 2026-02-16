// ================================
// إدارة السلة مع دعم الوزن
// هذا الملف مسؤول عن إدارة سلة التسوق مع دعم المنتجات الموزونة والقطعية
// ================================

// متغيرات السلة
let cart = []; // مصفوفة لتخزين عناصر السلة

// تحميل السلة من localStorage
// هذه الدالة تستعيد السلة المحفوظة من التخزين المحلي للمتصفح
function loadCart() {
    try {
        const savedCart = localStorage.getItem('cart'); // جلب السلة المحفوظة
        if (savedCart) {
            cart = JSON.parse(savedCart); // تحويل النص إلى كائن JavaScript
        }
    } catch (error) {
        console.warn('خطأ في تحميل السلة:', error); // رسالة خطأ
        cart = []; // إعادة تعيين السلة في حالة الخطأ
    }
}

// حفظ السلة في localStorage
// هذه الدالة تحفظ حالة السلة الحالية في التخزين المحلي
function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart)); // تحويل السلة إلى نص وحفظها
        updateCartUI(); // تحديث واجهة السلة
    } catch (error) {
        console.warn('خطأ في حفظ السلة:', error); // رسالة خطأ
    }
}

// إضافة منتج للسلة
// هذه الدالة تضيف منتج جديد للسلة مع دعم الكمية والوزن
function addToCart(product, quantity = 1, weight = null) {
    try {
        // البحث عن المنتج في السلة
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            // إذا كان المنتج موجوداً بالفعل، تحديث الكمية أو الوزن
            if (weight !== null) {
                existingItem.weight = (existingItem.weight || 0) + weight; // إضافة الوزن الجديد
            } else {
                existingItem.quantity = (existingItem.quantity || 0) + quantity; // إضافة الكمية الجديدة
            }
        } else {
            // إذا كان المنتج غير موجود، إضافته كعنصر جديد
            cart.push({
                id: product.id, // معرف المنتج
                name: product.name, // اسم المنتج
                price: product.price, // سعر المنتج
                image: product.image, // صورة المنتج
                quantity: weight === null ? quantity : 0, // الكمية (صفر إذا كان موزوناً)
                weight: weight, // الوزن (null إذا كان قطعياً)
                unit: product.unit || 'قطعة', // وحدة القياس (افتراضي: قطعة)
                soldByWeight: product.soldByWeight || false // هل يباع بالوزن؟
            });
        }
        
        saveCart(); // حفظ التغييرات
        showNotification('تم إضافة المنتج للسلة', 'success'); // رسالة نجاح
        
    } catch (error) {
        console.error('خطأ في إضافة المنتج للسلة:', error); // رسالة خطأ مفصلة
        showNotification('خطأ في إضافة المنتج', 'error'); // رسالة خطأ للمستخدم
    }
}

// إزالة منتج من السلة
// هذه الدالة تحذف منتج محدد من السلة بالكامل
function removeFromCart(productId) {
    try {
        cart = cart.filter(item => item.id !== productId); // تصفية السلة وإزالة المنتج
        saveCart(); // حفظ التغييرات
        showNotification('تم إزالة المنتج من السلة', 'success'); // رسالة نجاح
    } catch (error) {
        console.error('خطأ في إزالة المنتج:', error); // رسالة خطأ
    }
}

// تحديث كمية المنتج في السلة
// هذه الدالة تعدل كمية منتج موجود في السلة
function updateCartItemQuantity(productId, quantity) {
    try {
        const item = cart.find(item => item.id === productId); // البحث عن المنتج
        if (item) {
            item.quantity = Math.max(0, quantity); // ضمان عدم وجود كميات سالبة
            if (item.quantity === 0) {
                removeFromCart(productId); // إزالة المنتج إذا كانت الكمية صفر
            } else {
                saveCart(); // حفظ التغييرات
            }
        }
    } catch (error) {
        console.error('خطأ في تحديث الكمية:', error); // رسالة خطأ
    }
}

// تحديث وزن المنتج في السلة
// هذه الدالة تعدل وزن منتج موجود في السلة
function updateCartItemWeight(productId, weight) {
    try {
        const item = cart.find(item => item.id === productId); // البحث عن المنتج
        if (item) {
            item.weight = Math.max(0, weight); // ضمان عدم وجود أوزان سالبة
            if (item.weight === 0) {
                removeFromCart(productId); // إزالة المنتج إذا كان الوزن صفر
            } else {
                saveCart(); // حفظ التغييرات
            }
        }
    } catch (error) {
        console.error('خطأ في تحديث الوزن:', error); // رسالة خطأ
    }
}

// حساب الإجمالي
// هذه الدالة تحسب المبلغ الإجمالي لجميع المنتجات في السلة
function calculateTotal() {
    try {
        return cart.reduce((total, item) => {
            if (item.soldByWeight && item.weight) {
                // حساب للمنتجات الموزونة (السعر × الوزن)
                return total + (item.price * item.weight);
            } else {
                // حساب للمنتجات القطعية (السعر × الكمية)
                return total + (item.price * item.quantity);
            }
        }, 0); // البدء من صفر
    } catch (error) {
        console.error('خطأ في حساب الإجمالي:', error); // رسالة خطأ
        return 0; // إرجاع صفر في حالة الخطأ
    }
}

// تحديث واجهة السلة
// هذه الدالة تحديث جميع عناصر واجهة المستخدم للسلة
function updateCartUI() {
    try {
        // الحصول على عناصر الواجهة
        const cartCount = document.getElementById('cart-count'); // عداد السلة
        const cartItems = document.getElementById('cart-items'); // قائمة عناصر السلة
        const totalPrice = document.getElementById('total-price'); // السعر الإجمالي
        
        // تحديث عداد السلة
        if (cartCount) {
            const totalItems = cart.reduce((count, item) => {
                // حساب العدد الإجمالي (المنتجات الموزونة تحسب كواحد)
                return count + (item.soldByWeight ? 1 : item.quantity);
            }, 0);
            cartCount.textContent = totalItems; // تحديث النص
        }
        
        // تحديث قائمة السلة
        if (cartItems) {
            if (cart.length === 0) {
                // عرض رسالة عندما تكون السلة فارغة
                cartItems.innerHTML = '<p class="text-center">السلة فارغة</p>';
            } else {
                // إنشاء عناصر HTML لكل منتج في السلة
                cartItems.innerHTML = cart.map(item => `
                    <div class="cart-item">
                        <img src="${item.image || '../images/default-logo.png'}" alt="${item.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4> <!-- اسم المنتج -->
                            <p class="price">${item.price} ${item.unit === 'كجم' ? 'ج.م/كجم' : 'ج.م'}</p> <!-- السعر مع الوحدة -->
                            ${item.soldByWeight ? `
                                <!-- عناصر التحكم في الوزن للمنتجات الموزونة -->
                                <div class="weight-control">
                                    <input type="number" 
                                           value="${item.weight || 0}" 
                                           step="0.1" 
                                           min="0" 
                                           onchange="updateCartItemWeight('${item.id}', parseFloat(this.value))">
                                    <span>كجم</span> <!-- وحدة الوزن -->
                                </div>
                            ` : `
                                <!-- عناصر التحكم في الكمية للمنتجات القطعية -->
                                <div class="quantity-control">
                                    <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1})">-</button>
                                    <span>${item.quantity}</span> <!-- عرض الكمية الحالية -->
                                    <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})">+</button>
                                </div>
                            `}
                        </div>
                        <button class="remove-btn" onclick="removeFromCart('${item.id}')">×</button> <!-- زر الحذف -->
                    </div>
                `).join(''); // دمج جميع عناصر HTML
            }
        }
        
        // تحديث الإجمالي
        if (totalPrice) {
            totalPrice.textContent = calculateTotal().toFixed(2) + ' ج.م'; // عرض المبلغ الإجمالي
        }
        
    } catch (error) {
        console.error('خطأ في تحديث واجهة السلة:', error); // رسالة خطأ
    }
}

// إظهار الإشعارات
// هذه الدالة تعرض إشعارات للمستخدم لإعلامه بالعمليات المختلفة
function showNotification(message, type = 'info') {
    try {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `notification ${type}`; // إضافة الفئة حسب النوع
        notification.textContent = message; // نص الرسالة
        
        // تنسيق الإشعار باستخدام CSS
        notification.style.cssText = `
            position: fixed; // تثبيت الإشعار في أعلى الصفحة
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

// تهيئة السلة عند تحميل الصفحة
// هذا الحدث يضمن تهيئة السلة فوراً بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadCart(); // تحميل السلة من التخزين المحلي
    updateCartUI(); // تحديث واجهة السلة
});

// تصدير الدوال للاستخدام الخارجي
// هذه الدوال تصدر لتكون متاحة للاستخدام من ملفات JavaScript أخرى
window.addToCart = addToCart; // دالة إضافة منتج للسلة
window.removeFromCart = removeFromCart; // دالة إزالة منتج من السلة
window.updateCartItemQuantity = updateCartItemQuantity; // دالة تحديث كمية المنتج
window.updateCartItemWeight = updateCartItemWeight; // دالة تحديث وزن المنتج
window.calculateTotal = calculateTotal; // دالة حساب الإجمالي
