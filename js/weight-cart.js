// نظام الوزن التلقائي للسلة
// يزيد الوزن تلقائياً من 1 كجم إلى الحد الأقصى عند الشراء المتكرر

class WeightCart {
    constructor() {
        this.weightSettings = {
            min: 0.1,      // الحد الأدنى للوزن
            max: 10,       // الحد الأقصى للوزن
            increment: 0.25, // الزيادة التلقائية
            current: {}    // الوزن الحالي لكل منتج
        };
        this.loadWeightSettings();
    }

    // تحميل إعدادات الوزن من Firebase
    async loadWeightSettings() {
        try {
            if (window.siteSettings && window.siteSettings.store) {
                const store = window.siteSettings.store;
                this.weightSettings = {
                    min: store.weightMin || 0.125,
                    max: store.weightMax || 1,
                    increment: store.weightIncrement || 0.125,
                    options: store.weightOptions || ['0.125', '0.25', '0.375', '0.5', '0.625', '0.75', '0.875', '1'],
                    current: {}
                };
                console.log('Weight settings loaded:', this.weightSettings);
            }
        } catch (error) {
            console.error('Error loading weight settings:', error);
        }
    }

    // حساب الوزن التلقائي للمنتج
    calculateAutoWeight(productId, baseWeight = null, soldByWeight = false) {
        if (!soldByWeight) return null; // المنتج يُباع بالعدد فقط
        
        const weight = baseWeight || 1; // الوزن الافتراضي 1 كجم
        
        // إذا لم يكن هناك وزن أساسي، نبدأ من الحد الأدنى
        const startWeight = baseWeight || this.weightSettings.min;
        
        // التحقق من الوزن الحالي للمنتج
        if (!this.weightSettings.current[productId]) {
            this.weightSettings.current[productId] = startWeight;
        }
        
        let currentWeight = this.weightSettings.current[productId];
        
        // زيادة الوزن تلقائياً
        currentWeight += this.weightSettings.increment;
        
        // التأكد من عدم تجاوز الحد الأقصى
        if (currentWeight > this.weightSettings.max) {
            currentWeight = this.weightSettings.max;
        }
        
        // حفظ الوزن الجديد
        this.weightSettings.current[productId] = currentWeight;
        
        console.log(`Auto weight for product ${productId}: ${currentWeight} kg`);
        return currentWeight;
    }

    // إعادة تعيين الوزن للمنتج
    resetWeight(productId) {
        delete this.weightSettings.current[productId];
        console.log(`Weight reset for product ${productId}`);
    }

    // الحصول على الوزن الحالي للمنتج
    getCurrentWeight(productId) {
        return this.weightSettings.current[productId] || this.weightSettings.min;
    }

    // تحديث الوزن في السلة
    updateCartItemWeight(cartItem) {
        if (cartItem.soldByWeight) {
            const autoWeight = this.calculateAutoWeight(
                cartItem.productId, 
                cartItem.weight, 
                cartItem.soldByWeight
            );
            cartItem.calculatedWeight = autoWeight;
            cartItem.weight = autoWeight;
        }
        return cartItem;
    }

    // حساب السعر الإجمالي بناءً على الوزن
    calculateWeightedPrice(cartItem) {
        if (!cartItem.soldByWeight) {
            return cartItem.price * cartItem.quantity;
        }
        
        const weight = cartItem.calculatedWeight || cartItem.weight || 1;
        return cartItem.price * weight;
    }

    // عرض معلومات الوزن في واجهة المستخدم
    displayWeightInfo(productId, weightElement) {
        if (!weightElement) return;
        
        const currentWeight = this.getCurrentWeight(productId);
        const nextWeight = Math.min(currentWeight + this.weightSettings.increment, this.weightSettings.max);
        
        weightElement.innerHTML = `
            <div class="weight-info">
                <span class="current-weight">الوزن الحالي: ${currentWeight} كجم</span>
                <span class="next-weight">الوزن التالي: ${nextWeight} كجم</span>
                <small class="weight-range">النطاق: ${this.weightSettings.min} - ${this.weightSettings.max} كجم</small>
            </div>
        `;
    }

    // إضافة مستمعي الأحداث لأزرار الكمية
    setupQuantityListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-increase') || 
                e.target.classList.contains('quantity-decrease')) {
                
                const cartItem = e.target.closest('.cart-item');
                const productId = cartItem?.dataset.productId;
                
                if (productId) {
                    // تحديث الوزن عند تغيير الكمية
                    setTimeout(() => {
                        this.updateCartItemWeightInUI(productId);
                    }, 100);
                }
            }
        });
    }

    // تحديث وزن المنتج في واجهة المستخدم
    updateCartItemWeightInUI(productId) {
        const cartItem = document.querySelector(`[data-product-id="${productId}"]`);
        if (cartItem) {
            const weightElement = cartItem.querySelector('.weight-display');
            if (weightElement) {
                this.displayWeightInfo(productId, weightElement);
            }
        }
    }
}

// إنشاء نسخة واحدة من نظام الوزن
const weightCart = new WeightCart();

// تصدير للاستخدام في ملفات أخرى
window.weightCart = weightCart;

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    weightCart.setupQuantityListeners();
    
    // تحديث جميع عناصر الوزن في السلة
    setTimeout(() => {
        document.querySelectorAll('.cart-item').forEach(item => {
            const productId = item.dataset.productId;
            if (productId) {
                weightCart.updateCartItemWeightInUI(productId);
            }
        });
    }, 1000);
});

// استماع لتغييرات الإعدادات
if (window.siteSettings) {
    // تحديث الإعدادات عند تغييرها
    const originalLoadAllSettings = window.loadAllSettings;
    if (originalLoadAllSettings) {
        window.loadAllSettings = async function() {
            await originalLoadAllSettings();
            await weightCart.loadWeightSettings();
        };
    }
}

// ملاحظة: هذا الملف يتم تحميله كـ script عادي (ليس type="module")
// لذلك نستخدم window.weightCart بدلاً من export.
