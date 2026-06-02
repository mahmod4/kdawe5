/**
 * ========================================
 * صفحة السلة - Shopping Cart Management
 * ========================================
 * 
 * Purpose: إدارة سلة المشتريات وإتمام عملية الشراء
 * Usage: صفحة السلة التي يعرضها المتجر للعملاء
 * Features: إدارة السلة، حساب الأسعار، إرسال الطلبات
 * 
 * يحتوي هذا الملف على:
 * - قراءة وحفظ بيانات السلة من localStorage
 * - عرض منتجات السلة مع الصور والتفاصيل
 * - حساب الأسعار الإجمالية مع رسوم التوصيل
 * - تعديل كميات المنتجات وحذف العناصر
 * - إرسال الطلبات عبر WhatsApp
 * - حفظ الطلبات في Firestore للمستخدمين المسجلين
 * - التحقق من تسجيل الدخول قبل إتمام الطلب
 * - جمع بيانات العميل (اسم، عنوان، هاتف)
 * 
 * الوظائف الرئيسية:
 * - loadCart(): تحميل وعرض محتويات السلة
 * - updateCartUI(): تحديث واجهة السلة
 * - calculateTotals(): حساب الإجماليات
 * - updateQuantity(): تحديث الكميات
 * - removeFromCart(): حذف منتج من السلة
 * - checkout(): إتمام عملية الشراء
 * - sendWhatsAppOrder(): إرسال الطلب عبر WhatsApp
 * - saveOrderToFirestore(): حفظ الطلب في قاعدة البيانات
 * 
 * Features:
 * - دعم البيع بالوزن والوحدة
 * - حساب رسوم التوصيل ديناميكياً
 * - حقول مخصصة لبيانات العملاء
 * - التحقق من صحة البيانات
 * - معالجة الأخطاء
 * 
 * Dependencies:
 * - localStorage للتخزين المحلي
 * - Firebase Firestore لحفظ الطلبات
 * - WhatsApp API للتواصل
 * - Bootstrap للواجهة
 * 
 * Author: نظام المتجر الإلكتروني
 * Version: 1.0.0
 */
// ================================
//  صفحة السلة - أسواق الشادر
// ================================

(function () {
  // ================================
  // هذا الملف مسؤول عن صفحة السلة:
  // - قراءة/حفظ السلة من localStorage
  // - عرض العناصر وحساب الإجماليات
  // - تعديل الكميات والحذف
  // - إرسال الطلب (واتساب) + حفظه في Firestore عند تسجيل الدخول
  // - منع إتمام الطلب بدون تسجيل دخول (تحويل لصفحة login)
  // ================================

  // قراءة رسوم التوصيل من الإعدادات (مع قيمة افتراضية)
  function getDeliveryFee() {
    const v = window.APP_SETTINGS && Number(window.APP_SETTINGS.DELIVERY_FEE);
    return Number.isFinite(v) && v >= 0 ? v : 20;
  }

  function getCustomerFieldDefs() {
    const S = window.APP_SETTINGS || {};
    const defs = Array.isArray(S.CUSTOMER_FIELDS) ? S.CUSTOMER_FIELDS : null;
    if (defs && defs.length) return defs;
    return [
      { label: 'الاسم الأول', type: 'text', required: true, defaultValue: '' },
      { label: 'الاسم الثاني', type: 'text', required: true, defaultValue: '' },
      { label: 'العنوان', type: 'text', required: true, defaultValue: '' },
      { label: 'رقم الهاتف', type: 'tel', required: true, defaultValue: '' }
    ];
  }

  function normalizeFieldKey(label, index) {
    const base = String(label || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    return base ? base : `field_${index + 1}`;
  }

  function renderCustomerFields() {
    const container = document.getElementById('customer-fields');
    if (!container) return; // Defensive: return early if container doesn't exist
    const defs = getCustomerFieldDefs();
    if (!defs || !defs.length) return;
    container.innerHTML = '';

    defs.forEach((def, idx) => {
      const label = def && def.label ? String(def.label) : '';
      if (!label) return;
      const type = def && def.type ? String(def.type) : 'text';
      const required = !!(def && def.required);
      const defaultValue = def && typeof def.defaultValue === 'string' ? def.defaultValue : (def && def.defaultValue != null ? String(def.defaultValue) : '');
      const key = def && def.key ? String(def.key) : normalizeFieldKey(label, idx);

      // Create wrapper with proper CSS class (compliant with styles.css)
      const wrap = document.createElement('div');
      wrap.className = 'customer-field-group'; // CSS class for consistent styling
      
      // Create label element with proper CSS class
      const labelEl = document.createElement('label');
      labelEl.className = 'customer-field-label'; // CSS class for form labels
      labelEl.textContent = label;
      wrap.appendChild(labelEl);

      // Create input/textarea with proper CSS class
      let input;
      if (type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
        input.className = 'customer-field-input'; // CSS class for form inputs
      } else {
        input = document.createElement('input');
        input.type = type === 'tel' ? 'tel' : 'text';
        input.className = 'customer-field-input'; // CSS class for form inputs
      }
      
      input.dataset.customerFieldKey = key;
      input.dataset.customerFieldLabel = label;
      input.dataset.customerFieldRequired = required ? '1' : '0';
      
      if (required) {
        input.required = true;
        input.setAttribute('aria-required', 'true');
      }
      
      if (!String(input.value || '').trim() && defaultValue) {
        input.value = defaultValue;
      }
      
      wrap.appendChild(input);
      container.appendChild(wrap);
    });
  }

  function readCustomerFieldValues() {
    const container = document.getElementById('customer-fields');
    if (!container) return { ok: true, missingLabel: '', values: {}, lines: [], displayName: '' };
    const inputs = Array.from(container.querySelectorAll('input[data-customer-field-key], textarea[data-customer-field-key]'));
    const values = {};
    const lines = [];
    let firstText = '';

    for (const el of inputs) {
      const key = el.dataset.customerFieldKey ? String(el.dataset.customerFieldKey) : '';
      const label = el.dataset.customerFieldLabel ? String(el.dataset.customerFieldLabel) : '';
      const required = el.dataset.customerFieldRequired === '1';
      const value = typeof el.value === 'string' ? el.value.trim() : '';
      if (required && !value) {
        return { ok: false, missingLabel: label || key, values: {}, lines: [], displayName: '' };
      }
      if (key) values[key] = value;
      if (label) lines.push(`${label}: ${value || '-'}`);
      if (!firstText && value) firstText = value;
    }

    return { ok: true, missingLabel: '', values, lines, displayName: firstText };
  }

  // تحديد وحدة الوزن (من عنصر السلة أو من إعدادات المتجر)
  function getWeightUnit(item) {
    try {
      if (item && item.weightUnit) return String(item.weightUnit);
      if (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightUnit) {
        return String(window.siteSettings.store.weightUnit);
      }
    } catch (e) {}
    return 'كجم';
  }

  /**
   * قراءة السلة من localStorage
   */
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * حفظ السلة في localStorage
   */
  function writeCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  /**
   * تنسيق إنشاء عنصر السلة
   */
  function createCartItemElement(item) {
    // بناء عنصر واجهة يمثل منتج داخل السلة
    const wrapper = document.createElement('div');
    wrapper.className = 'cart-item';

    const img = document.createElement('img');
    img.src = (typeof window.getProductImageDisplayUrl === 'function')
      ? window.getProductImageDisplayUrl(item.image)
      : (item.image || '');
    img.alt = item.name;
    img.onerror = function () {
      if (typeof window.onProductImageError === 'function') {
        window.onProductImageError(this);
      } else if (window.PRODUCT_IMAGE_PLACEHOLDER_DATA_URL) {
        this.onerror = null;
        this.src = window.PRODUCT_IMAGE_PLACEHOLDER_DATA_URL;
      }
    };
    img.width = 70;
    img.height = 70;
    wrapper.appendChild(img);

    const info = document.createElement('div');
    info.className = 'cart-item-info';

    const title = document.createElement('h4');
    title.className = 'cart-item-title';
    if (item.soldByWeight) {
      title.textContent = `${item.name} (${item.selectedWeight} ${getWeightUnit(item)})`;
    } else {
      title.textContent = item.name;
    }
    info.appendChild(title);

    const price = document.createElement('p');
    price.className = 'cart-item-price';
    price.textContent = `${item.price} ج.م`;
    info.appendChild(price);

    wrapper.appendChild(info);

    const qtyDiv = document.createElement('div');
    qtyDiv.className = 'cart-item-quantity';

    const decBtn = document.createElement('button');
    decBtn.className = 'quantity-btn decrease';
    decBtn.textContent = '-';
    decBtn.addEventListener('click', () => changeQty(item, -1));
    qtyDiv.appendChild(decBtn);

    const qtySpan = document.createElement('span');
    qtySpan.textContent = item.quantity;
    qtyDiv.appendChild(qtySpan);

    const incBtn = document.createElement('button');
    incBtn.className = 'quantity-btn increase';
    incBtn.textContent = '+';
    incBtn.addEventListener('click', () => changeQty(item, +1));
    qtyDiv.appendChild(incBtn);

    wrapper.appendChild(qtyDiv);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-item';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeItem(item));
    wrapper.appendChild(removeBtn);

    return wrapper;
  }

  /**
   * إعادة العرض
   */
  function render() {
    // إعادة رسم السلة بالكامل بناءً على البيانات المخزنة
    const cart = readCart();
    const list = document.getElementById('cart-page-items');
    const subtotalEl = document.getElementById('subtotal-amount');
    const deliveryEl = document.getElementById('delivery-fee');
    const grandEl = document.getElementById('grand-total');
    const badgeDesktop = document.getElementById('cart-count-desktop');

    if (!list) return;
    list.innerHTML = '';

    if (cart.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'no-products';
      empty.textContent = 'السلة فارغة';
      list.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      cart.forEach((item) => fragment.appendChild(createCartItemElement(item)));
      list.appendChild(fragment);
    }

    const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const deliveryFee = getDeliveryFee();
    const grand = subtotal + deliveryFee;

    if (subtotalEl) subtotalEl.textContent = String(subtotal);
    if (deliveryEl) deliveryEl.textContent = String(deliveryFee);
    if (grandEl) grandEl.textContent = String(grand);

    const totalItems = cart.reduce((s, it) => s + it.quantity, 0);
    if (badgeDesktop) badgeDesktop.textContent = String(totalItems);
  }

  /**
   * تغيير الكمية
   */
  function changeQty(targetItem, delta) {
    // تعديل كمية عنصر داخل السلة (مع مراعاة الوزن المختار)
    const cart = readCart();
    const idx = cart.findIndex(
      (i) => String(i.id) === String(targetItem.id) && Number(i.selectedWeight) === Number(targetItem.selectedWeight)
    );
    if (idx === -1) return;
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
    writeCart(cart);
    render();
    renderCustomerFields();
  }

  /**
   * إزالة عنصر
   */
  function removeItem(targetItem) {
    // حذف عنصر من السلة (محدد بـ id + الوزن المختار)
    let cart = readCart();
    cart = cart.filter(
      (i) => !(String(i.id) === String(targetItem.id) && Number(i.selectedWeight) === Number(targetItem.selectedWeight))
    );
    writeCart(cart);
    render();
  }

  /**
   * إرسال الطلب إلى واتساب مع رسوم التوصيل وحفظه في Firebase
   */
  async function sendOrder() {
    // إرسال الطلب:
    // 1) التحقق من وجود عناصر
    // 2) التحقق من تسجيل الدخول (إلزامي)
    // 3) التحقق من بيانات العميل
    // 4) إنشاء رسالة واتساب
    // 5) حفظ الطلب في Firestore (إذا المستخدم مسجل)
    const cart = readCart();
    if (!cart.length) {
      if (typeof window.showToast === 'function') {
        window.showToast('السلة فارغة!', 'error');
      }
      return;
    }

    try {
      if (window.firebase && typeof window.firebase.auth === 'function') {
        const user = window.firebase.auth().currentUser;
        if (!user) {
          try {
            sessionStorage.setItem('postLoginRedirect', window.location.href);
          } catch (e) {}
          if (typeof window.showToast === 'function') {
            window.showToast('يجب تسجيل الدخول لإكمال الطلب', 'error');
          }
          window.location.href = 'login.html';
          return;
        }
      }
    } catch (e) {
    }

    const customer = readCustomerFieldValues();
    if (!customer.ok) {
      if (typeof window.showToast === 'function') {
        window.showToast(`يرجى تعبئة الحقل المطلوب: ${customer.missingLabel}`, 'error');
      }
      return;
    }
    const noteInput = document.getElementById('note-input');
    const noteValue = noteInput && typeof noteInput.value === 'string' ? noteInput.value.trim() : '';
    const selectedPaymentEl = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethod = selectedPaymentEl && selectedPaymentEl.value ? selectedPaymentEl.value : 'cash';
    let text = '🛒 *طلب جديد* 🛒\n\n';
    text += '📋 *تفاصيل الطلب:*\n';
    cart.forEach((item, idx) => {
      const unit = getWeightUnit(item);
      const weightLabel = item.soldByWeight && typeof item.selectedWeight !== 'undefined' && item.selectedWeight !== null
        ? ` (${item.selectedWeight} ${unit})`
        : '';
      text += `${idx + 1}. ${item.name}${weightLabel} - ${item.price} ج.م × ${item.quantity} = ${item.price * item.quantity} ج.م\n`;
    });
    const subtotal = cart.reduce((s, it) => s + it.price * it.quantity, 0);
    const deliveryFee = getDeliveryFee();
    const grand = subtotal + deliveryFee;
    text += `\n💰 *المجموع:* ${subtotal} ج.م`;
    text += `\n🚚 *التوصيل:* ${deliveryFee} ج.م`;
    text += `\n📦 *الإجمالي:* ${grand} ج.م\n`;
    text += `\n💳 *طريقة الدفع:* ${paymentMethod === 'visa' ? 'فيزا' : 'كاش عند الاستلام'}`;
    text += `\n\n👤 *بيانات العميل:*`;
    customer.lines.forEach((line) => {
      text += `\n- ${line}`;
    });
    if (noteValue) {
      text += `\n📝 *ملاحظة:* ${noteValue}`;
    }
    text += '\n\n🙏 يرجى تأكيد الطلب بإرسال عنوان التوصيل ورقم الهاتف';

    // حفظ الطلب في Firebase إذا كان المستخدم مسجل دخول
    try {
      if (window.orderService && typeof window.orderService.saveOrderForCurrentUser === 'function') {
        await window.orderService.saveOrderForCurrentUser(cart, grand, {
          paymentMethod,
          note: noteValue,
          customerFields: customer.values
        });
      }
    } catch (error) {
      console.error('خطأ في حفظ الطلب:', error);
    }

    const rawWhatsapp = (window.APP_SETTINGS && window.APP_SETTINGS.WHATSAPP_PHONE) || '';
    const whatsappPhone = String(rawWhatsapp).replace(/\s+/g, '').replace(/^\+/, '').replace(/[^0-9]/g, '') || '';
    const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener');
    if (win) { win.opener = null; }

    // تفريغ السلة بعد الإرسال
    writeCart([]);
    render();
  }

  /**
   * Expose the checkout function globally for integration with whatsapp-sync.js
   * This is the entry point for external scripts to trigger order submission
   */
  window.checkout = sendOrder;
  
  /**
   * Also expose the cart module for external access
   * Provides render() function for UI refresh and readCart() for getting current cart items
   */
  window.cartModule = {
    render: render,
    readCart: readCart,
    sendOrder: sendOrder,
    checkout: sendOrder
  };

  /**
   * تهيئة الصفحة وربط الأحداث
   */
  function initCartPage() {
    // Defensive check: if we're not on the cart page, return early without throwing errors
    const cartPageItems = document.getElementById('cart-page-items');
    if (!cartPageItems) {
      console.debug('Cart page not found - skipping cart initialization');
      return;
    }

    // ربط الأحداث وتهيئة الصفحة
    const checkoutBtn = document.getElementById('checkout-btn');
    const continueBtn = document.getElementById('continue-details-btn');
    const detailsSection = document.getElementById('customer-details');
    
    // Add event listener to checkout button
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', sendOrder);
    }
    
    // Add event listener to continue button to show customer details section
    if (continueBtn && detailsSection && checkoutBtn) {
      continueBtn.addEventListener('click', () => {
        detailsSection.classList.add('show'); // Use CSS class instead of inline style
        renderCustomerFields();
        checkoutBtn.style.display = 'block';
        continueBtn.style.display = 'none';
        try { 
          detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
        } catch (e) {
          console.debug('Scroll error:', e);
        }
      });
    }
    
    // Initial render
    render();

    // Listen for app settings updates to refresh cart and customer fields
    try {
      window.addEventListener('appSettingsUpdated', () => {
        render();
        renderCustomerFields();
      });
    } catch (e) {
      console.debug('Settings update listener error:', e);
    }
  }

  // Initialize cart page when DOM is ready, with error handling
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        initCartPage();
      } catch (error) {
        console.error('Error initializing cart page:', error);
      }
    });
  } else {
    try {
      initCartPage();
    } catch (error) {
      console.error('Error initializing cart page:', error);
    }
  }
})();

