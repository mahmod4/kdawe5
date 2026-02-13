// ================================
// نظام البيع بالوزن (واجهة المتجر)
// مسؤول عن:
// - عرض معلومات الوزن للمنتجات التي soldByWeight = true
// - إنشاء منتقي وزن (Buttons + Input)
// - تحديث السعر بناءً على الوزن المختار
// - قراءة إعدادات الوزن من siteSettings (min/max/increment/options)
// ================================

class WeightProducts {
    constructor() {
        // إعدادات افتراضية (يتم استبدالها من siteSettings إن وُجدت)
        this.weightSettings = {
            min: 0.1,
            max: 10,
            increment: 0.25
        };
        this.loadWeightSettings();
    }

    getWeightUnit(product) {
        // تحديد وحدة الوزن (من المنتج أو من إعدادات المتجر)
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
        // تنسيق قيمة الوزن للعرض (بدون أصفار غير مهمة)
        const n = Number(value);
        if (Number.isNaN(n)) return '';
        if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
        return String(n);
    }

    // تحميل إعدادات الوزن
    async loadWeightSettings() {
        // قراءة إعدادات الوزن من siteSettings (إن كانت متاحة)
        try {
            if (window.siteSettings && window.siteSettings.store) {
                const store = window.siteSettings.store;
                this.weightSettings = {
                    min: store.weightMin || 0.125,
                    max: store.weightMax || 1,
                    increment: store.weightIncrement || 0.125,
                    options: store.weightOptions || ['0.125', '0.25', '0.375', '0.5', '0.625', '0.75', '0.875', '1']
                };
            }
        } catch (error) {
            console.error('Error loading weight settings:', error);
        }
    }

    // عرض معلومات الوزن في بطاقة المنتج
    displayProductWeight(product, productCard) {
        // يعرض بلوك معلومات الوزن أسفل السعر داخل بطاقة المنتج
        if (!product.soldByWeight) return;

        // منع التكرار عند إعادة التهيئة (search/filter/productsUpdated)
        try {
            const existing = productCard.querySelector('.weight-display');
            if (existing) existing.remove();
        } catch (e) {
        }

        const unit = this.getWeightUnit(product);

        const weightDisplay = document.createElement('div');
        weightDisplay.className = 'weight-display mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg';
        weightDisplay.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-semibold text-blue-800">
                    <i class="fas fa-weight ml-1"></i>الوزن:
                </span>
                <span class="text-sm font-bold text-blue-600">${this.formatWeightValue(product.weight || this.weightSettings.min)} ${unit}</span>
            </div>
            <div class="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                <i class="fas fa-info-circle ml-1"></i>يُباع بالوزن • النطاق: ${this.formatWeightValue(this.weightSettings.min)} - ${this.formatWeightValue(this.weightSettings.max)} ${unit}
            </div>
        `;

        // إضافة العرض بعد السعر
        const priceElement = productCard.querySelector('.product-price');
        if (priceElement) {
            priceElement.parentNode.insertBefore(weightDisplay, priceElement.nextSibling);
        }
    }

    // إنشاء منتقي الوزن التفاعلي
    createWeightPicker(product, container) {
        // يبني عناصر اختيار الوزن ويحقنها داخل container
        if (!product.soldByWeight) return;

        // منع تكرار المنتقي عند إعادة التهيئة
        try {
            const existingPicker = container.querySelector('.weight-picker');
            if (existingPicker) existingPicker.remove();
        } catch (e) {
        }

        const unit = this.getWeightUnit(product);

        const picker = document.createElement('div');
        picker.className = 'weight-picker mt-3';
        
        // الحصول على خيارات الوزن من الإعدادات
        const weightOptions = this.getWeightOptions();
        
        picker.innerHTML = `
            <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-balance-scale ml-1"></i>اختر الوزن:
            </label>
            <div class="flex items-center space-x-2 space-x-reverse mb-3">
                <select class="weight-select flex-1 border-2 border-blue-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" 
                        data-product-id="${product.id}">
                    ${weightOptions.map(option => `
                        <option value="${option.value}" 
                                ${option.value === (product.weight || this.weightSettings.min) ? 'selected' : ''}>
                            ${option.label}
                        </option>
                    `).join('')}
                </select>
                <span class="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">${unit}</span>
            </div>
            <div class="flex items-center space-x-2 space-x-reverse">
                <button type="button" class="weight-decrease bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 transition-colors" 
                        data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                    <i class="fas fa-minus text-xs"></i>
                </button>
                <input type="number" 
                       class="weight-input w-24 text-center border-2 border-blue-300 rounded-lg px-3 py-2 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" 
                       value="${product.weight || this.weightSettings.min}" 
                       min="${this.weightSettings.min}" 
                       max="${this.weightSettings.max}" 
                       step="${this.weightSettings.increment}"
                       data-product-id="${product.id}">
                <span class="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">${unit}</span>
                <button type="button" class="weight-increase bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-2 transition-colors" 
                        data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                    <i class="fas fa-plus text-xs"></i>
                </button>
            </div>
            <div class="text-xs text-gray-500 mt-2 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                <i class="fas fa-exclamation-triangle ml-1 text-yellow-600"></i>
                النطاق المسموح: ${this.formatWeightValue(this.weightSettings.min)} - ${this.formatWeightValue(this.weightSettings.max)} ${unit}
            </div>
        `;

        container.appendChild(picker);
        this.setupWeightPickerListeners(picker);
    }

    // الحصول على خيارات الوزن من الإعدادات
    getWeightOptions() {
        const unit = this.getWeightUnit(null);
        const defaultOptions = [
            { value: 0.125, label: `1/8 ${unit}` },
            { value: 0.25, label: `1/4 ${unit}` },
            { value: 0.375, label: `3/8 ${unit}` },
            { value: 0.5, label: `1/2 ${unit}` },
            { value: 0.625, label: `5/8 ${unit}` },
            { value: 0.75, label: `3/4 ${unit}` },
            { value: 0.875, label: `7/8 ${unit}` },
            { value: 1, label: `1 ${unit}` }
        ];

        // إذا كانت هناك خيارات محددة من الإعدادات
        if (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightOptions) {
            const selectedOptions = window.siteSettings.store.weightOptions;
            return defaultOptions.filter(option => selectedOptions.includes(option.value.toString()));
        }

        // فلترة الخيارات حسب النطاق المسموح
        return defaultOptions.filter(option => 
            option.value >= this.weightSettings.min && 
            option.value <= this.weightSettings.max
        );
    }

    // إعداد مستمعي الأحداث لمنتقي الوزن
    setupWeightPickerListeners(picker) {
        const decreaseBtn = picker.querySelector('.weight-decrease');
        const increaseBtn = picker.querySelector('.weight-increase');
        const input = picker.querySelector('.weight-input');
        const select = picker.querySelector('.weight-select');

        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(decreaseBtn.dataset.step);
            const newValue = Math.max(this.weightSettings.min, currentValue - step);
            input.value = newValue.toFixed(3);
            select.value = newValue;
            this.triggerWeightChange(input);
        });

        increaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(increaseBtn.dataset.step);
            const newValue = Math.min(this.weightSettings.max, currentValue + step);
            input.value = newValue.toFixed(3);
            select.value = newValue;
            this.triggerWeightChange(input);
        });

        input.addEventListener('change', () => {
            const value = parseFloat(input.value);
            if (value < this.weightSettings.min) {
                input.value = this.weightSettings.min.toFixed(3);
            } else if (value > this.weightSettings.max) {
                input.value = this.weightSettings.max.toFixed(3);
            }
            select.value = input.value;
            this.triggerWeightChange(input);
        });

        // إضافة مستمع للقائمة المنسدلة
        select.addEventListener('change', () => {
            const value = parseFloat(select.value);
            input.value = value.toFixed(3);
            this.triggerWeightChange(input);
        });
    }

    // تشغيل حدث تغيير الوزن
    triggerWeightChange(input) {
        const productId = input.dataset.productId;
        const weight = parseFloat(input.value);
        
        // إرسال حدث مخصص
        const event = new CustomEvent('weightChanged', {
            detail: { productId, weight }
        });
        document.dispatchEvent(event);
    }

    // تحديث سعر المنتج بناءً على الوزن
    updatePriceByWeight(productCard, weight, basePrice) {
        const priceElement = productCard.querySelector('.product-price');
        if (priceElement) {
            const productId = productCard.dataset.productId;
            const product = this.getProductData(productId);
            const unit = this.getWeightUnit(product);
            const newPrice = basePrice * weight;
            priceElement.innerHTML = `
                <span class="current-price">${newPrice.toFixed(2)} ج.م</span>
                <small class="text-xs text-gray-500 block">${this.formatWeightValue(weight)} ${unit} × ${basePrice} ج.م</small>
            `;
        }
    }

    // عرض مؤشر الوزن في السلة
    displayCartWeightIndicator(cartItem, weight) {
        if (!cartItem.soldByWeight) return;

        const unit = this.getWeightUnit(cartItem);

        const indicator = document.createElement('div');
        indicator.className = 'cart-weight-indicator text-xs text-gray-500 mt-1';
        indicator.textContent = `الوزن: ${this.formatWeightValue(weight)} ${unit}`;

        const nameElement = cartItem.querySelector('.item-name');
        if (nameElement) {
            nameElement.appendChild(indicator);
        }
    }

    // تهيئة جميع المنتجات في الصفحة
    initializeProducts() {
        document.querySelectorAll('.product').forEach(card => {
            const productId = card.dataset.productId;
            const product = this.getProductData(productId);
            
            if (product) {
                this.displayProductWeight(product, card);
                
                // إضافة منتقي الوزن في بطاقة المنتج
                const container = card.querySelector('.product-footer');
                if (container) {
                    this.createWeightPicker(product, container);
                }
            }
        });
    }

    // الحصول على بيانات المنتج
    getProductData(productId) {
        // البحث في قائمة المنتجات العالمية
        if (window.products) {
            return window.products.find(p => p.id === productId);
        }
        
        // البحث في قائمة المنتجات المحلية
        if (window.productsArray) {
            return window.productsArray.find(p => p.id === productId);
        }
        
        return null;
    }

    // إضافة مستمعي الأحداث العامة
    setupGlobalListeners() {
        // الاستماع لتغييرات الوزن
        document.addEventListener('weightChanged', (e) => {
            const { productId, weight } = e.detail;
            
            // تحديث السعر في بطاقة المنتج
            const productCard = document.querySelector(`[data-product-id="${productId}"]`);
            if (productCard) {
                const product = this.getProductData(productId);
                if (product) {
                    this.updatePriceByWeight(productCard, weight, product.price);
                }
            }
        });

        // الاستماع لإضافة المنتجات للسلة
        document.addEventListener('addToCart', (e) => {
            const { productId, quantity, weight } = e.detail;
            
            if (weight) {
                // تحديث نظام الوزن في السلة
                if (window.weightCart) {
                    window.weightCart.calculateAutoWeight(productId, weight, true);
                }
            }
        });
    }
}

// إنشاء نسخة واحدة من نظام الوزن للمنتجات
const weightProducts = new WeightProducts();

// تصدير للاستخدام في ملفات أخرى
window.weightProducts = weightProducts;

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    weightProducts.setupGlobalListeners();
    
    // تهيئة المنتجات بعد تحميلها
    setTimeout(() => {
        weightProducts.initializeProducts();
    }, 1000);
    
    // إعادة تهيئة عند تغيير الصفحة
    document.addEventListener('productsUpdated', () => {
        setTimeout(() => {
            weightProducts.initializeProducts();
        }, 500);
    });
    
    // إعادة تهيئة عند البحث أو الفلترة
    const originalFilterProducts = window.filterProducts;
    if (originalFilterProducts) {
        window.filterProducts = function(...args) {
            const result = originalFilterProducts.apply(this, args);
            setTimeout(() => {
                weightProducts.initializeProducts();
            }, 500);
            return result;
        };
    }
});

// ملاحظة: هذا الملف يتم تحميله كـ script عادي (ليس type="module")
// لذلك نستخدم window.weightProducts بدلاً من export.
