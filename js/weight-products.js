// ================================
// نظام البيع بالوزن الجديد (واجهة المتجر)
// مسؤول عن:
// - عرض معلومات الوزن للمنتجات التي soldByWeight = true
// - إنشاء منتقي وزن حديث (Slider + Buttons)
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
                    options: store.weightOptions || []
                };
            }
        } catch (e) {
            console.warn('Failed to load weight settings:', e);
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
        weightDisplay.className = 'weight-display mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm';
        weightDisplay.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-bold text-blue-800 flex items-center">
                    <svg class="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z"/>
                    </svg>
                    الوزن:
                </span>
                <span class="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">${this.formatWeightValue(product.weight || this.weightSettings.min)} ${unit}</span>
            </div>
            <div class="text-xs text-blue-700 bg-blue-100/50 px-3 py-2 rounded-lg">
                <svg class="w-3 h-3 inline ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                يُباع بالوزن • النطاق: ${this.formatWeightValue(this.weightSettings.min)} - ${this.formatWeightValue(this.weightSettings.max)} ${unit}
            </div>
        `;

        // إضافة العرض بعد السعر
        const priceElement = productCard.querySelector('.product-price');
        if (priceElement) {
            priceElement.parentNode.insertBefore(weightDisplay, priceElement.nextSibling);
        }
    }

    // إنشاء منتقي الوزن التفاعلي الجديد
    createWeightPicker(product, container) {
        // يبني عناصر اختيار الوزن الجديدة ويحقنها داخل container
        if (!product.soldByWeight) return;

        // منع تكرار المنتقي عند إعادة التهيئة
        try {
            const existingPicker = container.querySelector('.weight-picker');
            if (existingPicker) existingPicker.remove();
        } catch (e) {
        }

        const unit = this.getWeightUnit(product);
        const currentWeight = product.weight || this.weightSettings.min;

        const picker = document.createElement('div');
        picker.className = 'weight-picker mt-4 p-4 bg-white border-2 border-gray-200 rounded-xl shadow-lg';
        
        picker.innerHTML = `
            <div class="mb-4">
                <label class="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <svg class="w-4 h-4 ml-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/>
                    </svg>
                    اختر الوزن المطلوب:
                </label>
                
                <!-- Slider الرئيسي -->
                <div class="mb-4">
                    <input type="range" 
                           class="weight-slider w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                           min="${this.weightSettings.min}" 
                           max="${this.weightSettings.max}" 
                           step="${this.weightSettings.increment}"
                           value="${currentWeight}"
                           data-product-id="${product.id}">
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>${this.formatWeightValue(this.weightSettings.min)} ${unit}</span>
                        <span class="font-bold text-blue-600">${this.formatWeightValue(currentWeight)} ${unit}</span>
                        <span>${this.formatWeightValue(this.weightSettings.max)} ${unit}</span>
                    </div>
                </div>

                <!-- أزرار الوزن السريعة -->
                <div class="grid grid-cols-4 gap-2 mb-4">
                    <button type="button" class="weight-preset-btn bg-gray-100 hover:bg-blue-100 border border-gray-300 hover:border-blue-400 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 transform hover:scale-105" 
                            data-product-id="${product.id}" data-weight="0.125">
                        ⅛ ${unit}
                    </button>
                    <button type="button" class="weight-preset-btn bg-gray-100 hover:bg-blue-100 border border-gray-300 hover:border-blue-400 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 transform hover:scale-105" 
                            data-product-id="${product.id}" data-weight="0.25">
                        ¼ ${unit}
                    </button>
                    <button type="button" class="weight-preset-btn bg-gray-100 hover:bg-blue-100 border border-gray-300 hover:border-blue-400 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 transform hover:scale-105" 
                            data-product-id="${product.id}" data-weight="0.5">
                        ½ ${unit}
                    </button>
                    <button type="button" class="weight-preset-btn bg-gray-100 hover:bg-blue-100 border border-gray-300 hover:border-blue-400 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 transform hover:scale-105" 
                            data-product-id="${product.id}" data-weight="1">
                        1 ${unit}
                    </button>
                </div>

                <!-- حقل الإدخال الدقيق وأزرار التحكم -->
                <div class="flex items-center space-x-3 space-x-reverse">
                    <button type="button" class="weight-decrease bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 transition-all duration-200 transform hover:scale-105 shadow-md" 
                            data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                        </svg>
                    </button>
                    
                    <div class="flex-1 relative">
                        <input type="number" 
                               class="weight-input w-full text-center border-2 border-blue-300 rounded-lg px-4 py-3 font-bold text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
                               value="${currentWeight}" 
                               min="${this.weightSettings.min}" 
                               max="${this.weightSettings.max}" 
                               step="${this.weightSettings.increment}"
                               data-product-id="${product.id}">
                        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">${unit}</span>
                    </div>
                    
                    <button type="button" class="weight-increase bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 transition-all duration-200 transform hover:scale-105 shadow-md" 
                            data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- معلومات السعر المحدث -->
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-green-800">السعر الإجمالي:</span>
                    <span class="text-lg font-bold text-green-600" id="price-display-${product.id}">
                        ${(product.price * currentWeight).toFixed(2)} ج.م
                    </span>
                </div>
                <div class="text-xs text-green-600 mt-1">
                    ${this.formatWeightValue(currentWeight)} ${unit} × ${product.price} ج.م
                </div>
            </div>
        `;

        container.appendChild(picker);
        this.setupWeightPickerListeners(picker, product);
    }

    // إعداد مستمعي الأحداث لمنتقي الوزن الجديد
    setupWeightPickerListeners(picker, product) {
        const slider = picker.querySelector('.weight-slider');
        const decreaseBtn = picker.querySelector('.weight-decrease');
        const increaseBtn = picker.querySelector('.weight-increase');
        const input = picker.querySelector('.weight-input');
        const presetBtns = picker.querySelectorAll('.weight-preset-btn');
        const priceDisplay = picker.querySelector(`#price-display-${product.id}`);

        // تحديث السعر
        const updatePrice = (weight) => {
            const newPrice = product.price * weight;
            priceDisplay.textContent = `${newPrice.toFixed(2)} ج.م`;
            
            // تحديث العرض في الـ slider
            const sliderDisplay = slider.parentElement.querySelector('.font-bold.text-blue-600');
            if (sliderDisplay) {
                sliderDisplay.textContent = `${this.formatWeightValue(weight)} ${this.getWeightUnit(product)}`;
            }
        };

        // مستمع الـ slider
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            input.value = value.toFixed(3);
            updatePrice(value);
            this.triggerWeightChange(input);
        });

        // أزرار التحكم
        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(decreaseBtn.dataset.step);
            const newValue = Math.max(this.weightSettings.min, currentValue - step);
            input.value = newValue.toFixed(3);
            slider.value = newValue;
            updatePrice(newValue);
            this.triggerWeightChange(input);
        });

        increaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(increaseBtn.dataset.step);
            const newValue = Math.min(this.weightSettings.max, currentValue + step);
            input.value = newValue.toFixed(3);
            slider.value = newValue;
            updatePrice(newValue);
            this.triggerWeightChange(input);
        });

        // حقل الإدخال
        input.addEventListener('input', () => {
            const value = parseFloat(input.value);
            if (!isNaN(value) && value >= this.weightSettings.min && value <= this.weightSettings.max) {
                slider.value = value;
                updatePrice(value);
                this.triggerWeightChange(input);
            }
        });

        input.addEventListener('change', () => {
            const value = parseFloat(input.value);
            if (value < this.weightSettings.min) {
                input.value = this.weightSettings.min.toFixed(3);
                slider.value = this.weightSettings.min;
                updatePrice(this.weightSettings.min);
            } else if (value > this.weightSettings.max) {
                input.value = this.weightSettings.max.toFixed(3);
                slider.value = this.weightSettings.max;
                updatePrice(this.weightSettings.max);
            }
            this.triggerWeightChange(input);
        });

        // أزرار الوزن السريعة
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const weight = parseFloat(btn.dataset.weight);
                input.value = weight.toFixed(3);
                slider.value = weight;
                
                // تحديث الأزرار
                presetBtns.forEach(b => {
                    b.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
                    b.classList.add('bg-gray-100', 'border-gray-300');
                });
                btn.classList.remove('bg-gray-100', 'border-gray-300');
                btn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
                
                updatePrice(weight);
                this.triggerWeightChange(input);
            });
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
                <span class="current-price font-bold text-lg">${newPrice.toFixed(2)} ج.م</span>
                <small class="text-xs text-gray-500 block">${this.formatWeightValue(weight)} ${unit} × ${basePrice} ج.م</small>
            `;
        }
    }

    // عرض مؤشر الوزن في السلة
    displayCartWeightIndicator(cartItem, weight) {
        if (!cartItem.soldByWeight) return;

        const unit = this.getWeightUnit(cartItem);

        const indicator = document.createElement('div');
        indicator.className = 'cart-weight-indicator text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg mt-2 font-medium';
        indicator.innerHTML = `
            <svg class="w-3 h-3 inline ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z"/>
            </svg>
            الوزن: ${this.formatWeightValue(weight)} ${unit}
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
}

const weightProducts = new WeightProducts();

// تصدير للاستخدام في ملفات أخرى
window.weightProducts = weightProducts;

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // انتظار تحميل المنتجات
    setTimeout(() => {
        weightProducts.initializeProducts();
    }, 500);
    
    // إعادة تهيئة عند البحث أو الفلترة
    const originalFilterProducts = window.filterProducts;
    if (originalFilterProducts) {
        window.filterProducts = function(...args) {
            const result = originalFilterProducts.apply(this, args);
            setTimeout(() => {
                weightProducts.initializeProducts();
            }, 100);
            return result;
        };
    }

    // استماع لتغييرات المنتجات
    document.addEventListener('productsUpdated', () => {
        setTimeout(() => {
            weightProducts.initializeProducts();
        }, 100);
    });
    
    // استماع لتغييرات الوزن
    document.addEventListener('weightChanged', (e) => {
        const { productId, weight } = e.detail;
        
        if (weight) {
            // تحديث نظام الوزن في السلة
            if (window.weightCart) {
                window.weightCart.calculateAutoWeight(productId, weight, true);
            }
        }
    });
});

// ملاحظة: هذا الملف يتم تحميله كـ script عادي (ليس type="module")
// لذلك نستخدم window.weightProducts بدلاً من export.
