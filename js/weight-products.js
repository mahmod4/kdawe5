// ================================
// نظام البيع بالوزن (واجهة المتجر) - تصميم جديد
// مسؤول عن:
// - عرض معلومات الوزن للمنتجات التي soldByWeight = true
// - إنشاء منتقي وزن عصري وأنيق
// - تحديث السعر بناءً على الوزن المختار
// - قراءة إعدادات الوزن من siteSettings (min/max/increment/options)
// ================================

class WeightProducts {
    constructor() {
        // إعدادات افتراضية (يتم استبدالها من siteSettings إن وُجدت)
        this.weightSettings = {
            min: 0.1,
            max: 10,
            increment: 0.25,
            unit: 'كجم'
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
                    unit: store.weightUnit || 'كجم'
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
        weightDisplay.className = 'weight-display';
        weightDisplay.innerHTML = `
            <div class="weight-header">
                <div class="weight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10 5z"/>
                        <path d="M2 17l10-5 10 5M2 12l10 5 10-5"/>
                    </svg>
                    <span>يُباع بالوزن</span>
                </div>
                <div class="weight-range">
                    <span class="min">${this.formatWeightValue(this.weightSettings.min)}</span>
                    <span>-</span>
                    <span class="max">${this.formatWeightValue(this.weightSettings.max)}</span>
                    <span class="unit">${unit}</span>
                </div>
            </div>
        `;

        // إضافة العرض بعد السعر
        const priceElement = productCard.querySelector('.product-price');
        if (priceElement) {
            priceElement.parentNode.insertBefore(weightDisplay, priceElement.nextSibling);
        }
    }

    // إنشاء منتقي الوزن التفاعلي - تصميم جديد
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
        const weightOptions = this.getWeightOptions();

        const picker = document.createElement('div');
        picker.className = 'weight-picker';
        picker.innerHTML = `
            <div class="weight-picker-header">
                <div class="weight-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12h18m-9-9v18"/>
                    </svg>
                    اختر الوزن
                </div>
                <div class="weight-unit">${unit}</div>
            </div>
            
            <div class="weight-selector">
                <div class="weight-presets">
                    ${weightOptions.map(option => `
                        <button type="button" 
                                class="weight-preset ${option.value === (product.weight || this.weightSettings.min) ? 'active' : ''}"
                                data-product-id="${product.id}" 
                                data-weight="${option.value}">
                            <span class="value">${option.label}</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="weight-custom">
                    <div class="weight-input-group">
                        <button type="button" class="weight-btn decrease" 
                                data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 12H4"/>
                            </svg>
                        </button>
                        <input type="number" 
                               class="weight-input" 
                               value="${product.weight || this.weightSettings.min}" 
                               min="${this.weightSettings.min}" 
                               max="${this.weightSettings.max}" 
                               step="${this.weightSettings.increment}"
                               data-product-id="${product.id}">
                        <button type="button" class="weight-btn increase" 
                                data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14m-7-7l7 7 7-7"/>
                            </svg>
                        </button>
                        <span class="input-unit">${unit}</span>
                    </div>
                </div>
            </div>
            
            <div class="weight-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
                <span>النطاق: ${this.formatWeightValue(this.weightSettings.min)} - ${this.formatWeightValue(this.weightSettings.max)} ${unit}</span>
            </div>
        `;

        container.appendChild(picker);
        this.setupWeightPickerListeners(picker);
    }

    // الحصول على خيارات الوزن من الإعدادات
    getWeightOptions() {
        const unit = this.getWeightUnit(null);
        const defaultOptions = [
            { value: 0.125, label: `⅛ ${unit}` },
            { value: 0.25, label: `¼ ${unit}` },
            { value: 0.375, label: `⅜ ${unit}` },
            { value: 0.5, label: `½ ${unit}` },
            { value: 0.625, label: `⅝ ${unit}` },
            { value: 0.75, label: `¾ ${unit}` },
            { value: 0.875, label: `⅞ ${unit}` },
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

    // إعداد مستمعي الأحداث لمنتقي الوزن - تصميم جديد
    setupWeightPickerListeners(picker) {
        const decreaseBtn = picker.querySelector('.decrease');
        const increaseBtn = picker.querySelector('.increase');
        const input = picker.querySelector('.weight-input');
        const presetBtns = picker.querySelectorAll('.weight-preset');

        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(decreaseBtn.dataset.step);
            const newValue = Math.max(this.weightSettings.min, currentValue - step);
            input.value = newValue.toFixed(3);
            this.updatePresetButtons(presetBtns, newValue);
            this.triggerWeightChange(input);
        });

        increaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(increaseBtn.dataset.step);
            const newValue = Math.min(this.weightSettings.max, currentValue + step);
            input.value = newValue.toFixed(3);
            this.updatePresetButtons(presetBtns, newValue);
            this.triggerWeightChange(input);
        });

        input.addEventListener('change', () => {
            const value = parseFloat(input.value);
            if (value < this.weightSettings.min) {
                input.value = this.weightSettings.min.toFixed(3);
            } else if (value > this.weightSettings.max) {
                input.value = this.weightSettings.max.toFixed(3);
            }
            this.updatePresetButtons(presetBtns, value);
            this.triggerWeightChange(input);
        });

        // إضافة مستمعي الأحداث لأزرار الخيارات
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const weight = parseFloat(btn.dataset.weight);
                input.value = weight.toFixed(3);
                this.updatePresetButtons(presetBtns, weight);
                this.triggerWeightChange(input);
            });
        });
    }

    // تحديث أزرار الخيارات - تصميم جديد
    updatePresetButtons(presetBtns, selectedValue) {
        presetBtns.forEach(btn => {
            const weight = parseFloat(btn.dataset.weight);
            if (Math.abs(weight - selectedValue) < 0.001) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
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
                <div class="price-weighted">
                    <span class="current-price">${newPrice.toFixed(2)} ج.م</span>
                    <small class="weight-calculation">${this.formatWeightValue(weight)} ${unit} × ${basePrice} ج.م</small>
                </div>
            `;
        }
    }

    // عرض مؤشر الوزن في السلة
    displayCartWeightIndicator(cartItem, weight) {
        if (!cartItem.soldByWeight) return;

        const unit = this.getWeightUnit(cartItem);

        const indicator = document.createElement('div');
        indicator.className = 'cart-weight-indicator';
        indicator.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10 5z"/>
                <path d="M2 17l10-5 10 5M2 12l10 5 10-5"/>
            </svg>
            <span>الوزن: ${this.formatWeightValue(weight)} ${unit}</span>
        `;

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
