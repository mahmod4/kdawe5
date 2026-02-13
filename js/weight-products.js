// ================================
// نظام البيع بالوزن المبسط (واجهة المتجر)
// مسؤول عن:
// - عرض قائمة منسدلة للوزن فقط
// - تحديث السعر بناءً على الوزن المختار
// - تصميم بسيط وواضح
// ================================

class WeightProducts {
    constructor() {
        // إعدادات افتراضية
        this.weightSettings = {
            min: 0.125,
            max: 1,
            increment: 0.125
        };
        this.loadWeightSettings();
    }

    getWeightUnit(product) {
        // تحديد وحدة الوزن
        try {
            if (product && product.weightUnit) return String(product.weightUnit);
            if (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightUnit) {
                return String(window.siteSettings.store.weightUnit);
            }
        } catch (e) {
        }
        return 'كجم';
    }

    formatWeightValue(value) {
        // تنسيق قيمة الوزن للعرض
        const n = Number(value);
        if (Number.isNaN(n)) return '';
        if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
        return String(n);
    }

    // تحميل إعدادات الوزن
    async loadWeightSettings() {
        try {
            if (window.siteSettings && window.siteSettings.store) {
                const store = window.siteSettings.store;
                this.weightSettings = {
                    min: store.weightMin || 0.125,
                    max: store.weightMax || 1,
                    increment: store.weightIncrement || 0.125
                };
            }
        } catch (e) {
            console.warn('Failed to load weight settings:', e);
        }
    }

    // الحصول على خيارات الوزن
    getWeightOptions() {
        const unit = this.getWeightUnit(null);
        const options = [];
        
        // إنشاء خيارات الوزن من min إلى max
        for (let weight = this.weightSettings.min; weight <= this.weightSettings.max; weight += this.weightSettings.increment) {
            options.push({
                value: weight,
                label: `${this.formatWeightValue(weight)} ${unit}`,
                price: null // سيتم حسابها لاحقاً
            });
        }
        
        return options;
    }

    // إنشاء منتقي وزن بسيط
    createWeightPicker(product, container) {
        if (!product.soldByWeight) return;

        // إزالة أي منتقي موجود
        try {
            const existing = container.querySelector('.weight-picker-simple');
            if (existing) existing.remove();
        } catch (e) {
        }

        const unit = this.getWeightUnit(product);
        const weightOptions = this.getWeightOptions();
        
        const picker = document.createElement('div');
        picker.className = 'weight-picker-simple mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm';
        
        picker.innerHTML = `
            <div class="flex items-center justify-between space-x-2 space-x-reverse">
                <div class="flex items-center space-x-2 space-x-reverse">
                    <i class="fas fa-weight text-blue-600 text-sm"></i>
                    <label class="text-sm font-semibold text-gray-800">اختر الوزن:</label>
                </div>
                <select class="weight-select-simple bg-white border-2 border-blue-300 rounded-xl px-4 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer min-w-[180px]" 
                        data-product-id="${product.id}"
                        data-base-price="${product.price}">
                    ${weightOptions.map(option => `
                        <option value="${option.value}" data-price="${product.price * option.value}" class="font-medium">
                            ${option.label} - ${(product.price * option.value).toFixed(2)} ج.م
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="mt-2 text-xs text-blue-700 bg-blue-100 px-3 py-1 rounded-lg inline-block">
                <i class="fas fa-info-circle ml-1"></i>
                السعر يتغير حسب الوزن المختار
            </div>
        `;

        container.appendChild(picker);
        this.setupWeightPickerListeners(picker, product);
    }

    // إعداد مستمعي الأحداث
    setupWeightPickerListeners(picker, product) {
        const select = picker.querySelector('.weight-select-simple');
        const priceElement = picker.closest('.product').querySelector('.product-price');

        select.addEventListener('change', () => {
            const weight = parseFloat(select.value);
            const basePrice = parseFloat(select.dataset.basePrice);
            const newPrice = basePrice * weight;
            
            // تحديث السعر المعروض بتصميم أفضل
            if (priceElement) {
                priceElement.innerHTML = `
                    <div class="price-update-animation">
                        <span class="current-price text-xl font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200 inline-block">${newPrice.toFixed(2)} ج.م</span>
                        <div class="mt-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
                            <i class="fas fa-calculator ml-1"></i>
                            ${this.formatWeightValue(weight)} ${this.getWeightUnit(product)} × ${basePrice} ج.م
                        </div>
                    </div>
                `;
                
                // إضافة تأثير حركي بسيط
                priceElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    priceElement.style.transform = 'scale(1)';
                }, 200);
            }

            // إرسال حدث تغيير الوزن
            const event = new CustomEvent('weightChanged', {
                detail: { productId: product.id, weight }
            });
            document.dispatchEvent(event);
        });
    }

    // تهيئة جميع المنتجات
    initializeProducts() {
        document.querySelectorAll('.product').forEach(card => {
            const productId = card.dataset.productId;
            const product = this.getProductData(productId);
            
            if (product && product.soldByWeight) {
                const container = card.querySelector('.product-footer');
                if (container) {
                    this.createWeightPicker(product, container);
                }
            }
        });
    }

    // الحصول على بيانات المنتج
    getProductData(productId) {
        if (window.products) {
            return window.products.find(p => p.id === productId);
        }
        if (window.productsArray) {
            return window.productsArray.find(p => p.id === productId);
        }
        return null;
    }
}

// تهيئة النظام
const weightProductsInstance = new WeightProducts();
window.weightProducts = weightProductsInstance;

// بدء التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // انتظار تحميل المنتجات
    setTimeout(() => {
        weightProductsInstance.initializeProducts();
    }, 1000);
    
    // إعادة تهيئة عند البحث أو الفلترة
    const originalFilterProducts = window.filterProducts;
    if (originalFilterProducts) {
        window.filterProducts = function(...args) {
            const result = originalFilterProducts.apply(this, args);
            setTimeout(() => {
                weightProductsInstance.initializeProducts();
            }, 500);
            return result;
        };
    }
});

// استماع لتغييرات الإعدادات
if (window.siteSettings) {
    const originalLoadAllSettings = window.loadAllSettings;
    if (originalLoadAllSettings) {
        window.loadAllSettings = async function() {
            await originalLoadAllSettings();
            await weightProductsInstance.loadWeightSettings();
            weightProductsInstance.initializeProducts();
        };
    }
}
