// نظام عرض الوزن في صفحة المنتجات
// يعرض معلومات الوزن ويتيح التحكم فيه

class WeightProducts {
    constructor() {
        this.weightSettings = {
            min: 0.1,
            max: 10,
            increment: 0.25
        };
        this.loadWeightSettings();
    }

    // تحميل إعدادات الوزن
    async loadWeightSettings() {
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
        if (!product.soldByWeight) return;

        const weightDisplay = document.createElement('div');
        weightDisplay.className = 'weight-display mt-2 p-2 bg-gray-50 rounded';
        weightDisplay.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium">الوزن:</span>
                <span class="text-sm text-gray-600">${product.weight || this.weightSettings.min} كجم</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
                يُباع بالوزن • النطاق: ${this.weightSettings.min} - ${this.weightSettings.max} كجم
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
        if (!product.soldByWeight) return;

        const picker = document.createElement('div');
        picker.className = 'weight-picker mt-3';
        
        // الحصول على خيارات الوزن من الإعدادات
        const weightOptions = this.getWeightOptions();
        
        picker.innerHTML = `
            <label class="block text-sm font-medium mb-2">اختر الوزن:</label>
            <div class="weight-options-grid grid grid-cols-4 gap-2 mb-3">
                ${weightOptions.map(option => `
                    <button type="button" 
                            class="weight-option-btn border rounded px-2 py-1 text-xs hover:bg-blue-100 ${option.value === (product.weight || this.weightSettings.min) ? 'bg-blue-500 text-white' : ''}"
                            data-product-id="${product.id}" 
                            data-weight="${option.value}">
                        ${option.label}
                    </button>
                `).join('')}
            </div>
            <div class="flex items-center space-x-2 space-x-reverse">
                <button type="button" class="weight-decrease bg-gray-200 hover:bg-gray-300 rounded px-2 py-1" 
                        data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                    <i class="fas fa-minus text-xs"></i>
                </button>
                <input type="number" 
                       class="weight-input w-20 text-center border rounded px-2 py-1" 
                       value="${product.weight || this.weightSettings.min}" 
                       min="${this.weightSettings.min}" 
                       max="${this.weightSettings.max}" 
                       step="${this.weightSettings.increment}"
                       data-product-id="${product.id}">
                <span class="text-sm">كجم</span>
                <button type="button" class="weight-increase bg-gray-200 hover:bg-gray-300 rounded px-2 py-1" 
                        data-product-id="${product.id}" data-step="${this.weightSettings.increment}">
                    <i class="fas fa-plus text-xs"></i>
                </button>
            </div>
            <div class="text-xs text-gray-500 mt-1">
                النطاق: ${this.weightSettings.min} - ${this.weightSettings.max} كجم
            </div>
        `;

        container.appendChild(picker);
        this.setupWeightPickerListeners(picker);
    }

    // الحصول على خيارات الوزن من الإعدادات
    getWeightOptions() {
        const defaultOptions = [
            { value: 0.125, label: '1/8 كجم' },
            { value: 0.25, label: '1/4 كجم' },
            { value: 0.375, label: '3/8 كجم' },
            { value: 0.5, label: '1/2 كجم' },
            { value: 0.625, label: '5/8 كجم' },
            { value: 0.75, label: '3/4 كجم' },
            { value: 0.875, label: '7/8 كجم' },
            { value: 1, label: '1 كجم' }
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
        const optionBtns = picker.querySelectorAll('.weight-option-btn');

        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(decreaseBtn.dataset.step);
            const newValue = Math.max(this.weightSettings.min, currentValue - step);
            input.value = newValue.toFixed(3);
            this.updateOptionButtons(optionBtns, newValue);
            this.triggerWeightChange(input);
        });

        increaseBtn.addEventListener('click', () => {
            const currentValue = parseFloat(input.value);
            const step = parseFloat(increaseBtn.dataset.step);
            const newValue = Math.min(this.weightSettings.max, currentValue + step);
            input.value = newValue.toFixed(3);
            this.updateOptionButtons(optionBtns, newValue);
            this.triggerWeightChange(input);
        });

        input.addEventListener('change', () => {
            const value = parseFloat(input.value);
            if (value < this.weightSettings.min) {
                input.value = this.weightSettings.min.toFixed(3);
            } else if (value > this.weightSettings.max) {
                input.value = this.weightSettings.max.toFixed(3);
            }
            this.updateOptionButtons(optionBtns, value);
            this.triggerWeightChange(input);
        });

        // إضافة مستمعي الأحداث لأزرار الخيارات
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const weight = parseFloat(btn.dataset.weight);
                input.value = weight.toFixed(3);
                this.updateOptionButtons(optionBtns, weight);
                this.triggerWeightChange(input);
            });
        });
    }

    // تحديث أزرار الخيارات
    updateOptionButtons(optionBtns, selectedValue) {
        optionBtns.forEach(btn => {
            const weight = parseFloat(btn.dataset.weight);
            if (Math.abs(weight - selectedValue) < 0.001) {
                btn.classList.add('bg-blue-500', 'text-white');
                btn.classList.remove('border', 'hover:bg-blue-100');
            } else {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('border', 'hover:bg-blue-100');
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
            const newPrice = basePrice * weight;
            priceElement.innerHTML = `
                <span class="current-price">${newPrice.toFixed(2)} ج.م</span>
                <small class="text-xs text-gray-500 block">${weight} كجم × ${basePrice} ج.م</small>
            `;
        }
    }

    // عرض مؤشر الوزن في السلة
    displayCartWeightIndicator(cartItem, weight) {
        if (!cartItem.soldByWeight) return;

        const indicator = document.createElement('div');
        indicator.className = 'cart-weight-indicator text-xs text-gray-500 mt-1';
        indicator.textContent = `الوزن: ${weight} كجم`;

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

export default weightProducts;
