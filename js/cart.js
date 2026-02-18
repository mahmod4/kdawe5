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
    img.src = item.image;
    img.alt = item.name;
    img.width = 70;
    img.height = 70;
    wrapper.appendChild(img);

    const info = document.createElement('div');
    info.className = 'cart-item-info';

    const title = document.createElement('h4');
    title.className = 'cart-item-title';
    title.textContent = `${item.name} (${item.selectedWeight} كجم)`;
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

    const firstNameEl = document.getElementById('first-name');
    const lastNameEl = document.getElementById('last-name');
    const addressEl = document.getElementById('address');
    const phoneEl = document.getElementById('phone');
    const firstName = firstNameEl && typeof firstNameEl.value === 'string' ? firstNameEl.value.trim() : '';
    const lastName = lastNameEl && typeof lastNameEl.value === 'string' ? lastNameEl.value.trim() : '';
    const address = addressEl && typeof addressEl.value === 'string' ? addressEl.value.trim() : '';
    const customerPhone = phoneEl && typeof phoneEl.value === 'string' ? phoneEl.value.trim() : '';
    if (!firstName || !lastName || !address || !customerPhone) {
      if (typeof window.showToast === 'function') {
        window.showToast('يرجى تعبئة الاسم الأول والاسم الثاني والعنوان ورقم الهاتف قبل المتابعة.', 'error');
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
      const weightLabel = typeof item.selectedWeight !== 'undefined' && item.selectedWeight !== null ? ` (${item.selectedWeight} ${unit})` : '';
      text += `${idx + 1}. ${item.name}${weightLabel} - ${item.price} ج.م × ${item.quantity} = ${item.price * item.quantity} ج.م\n`;
    });
    const subtotal = cart.reduce((s, it) => s + it.price * it.quantity, 0);
    const deliveryFee = getDeliveryFee();
    const grand = subtotal + deliveryFee;
    text += `\n💰 *المجموع:* ${subtotal} ج.م`;
    text += `\n🚚 *التوصيل:* ${deliveryFee} ج.م`;
    text += `\n📦 *الإجمالي:* ${grand} ج.م\n`;
    text += `\n💳 *طريقة الدفع:* ${paymentMethod === 'visa' ? 'فيزا' : 'كاش عند الاستلام'}`;
    text += `\n👤 *العميل:* ${firstName} ${lastName}`;
    text += `\n📞 *الهاتف:* ${customerPhone}`;
    text += `\n📍 *العنوان:* ${address}`;
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
          customer: { firstName, lastName, address, phone: customerPhone }
        });
      }
    } catch (error) {
      console.error('خطأ في حفظ الطلب:', error);
    }

    const whatsappPhone = (window.APP_SETTINGS && window.APP_SETTINGS.WHATSAPP_PHONE) || '201013449050';
    const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener');
    if (win) { win.opener = null; }

    // تفريغ السلة بعد الإرسال
    writeCart([]);
    render();
  }

  /**
   * تهيئة الصفحة وربط الأحداث
   */
  function initCartPage() {
    // ربط الأحداث وتهيئة الصفحة
    const checkoutBtn = document.getElementById('checkout-btn');
    const continueBtn = document.getElementById('continue-details-btn');
    const detailsSection = document.getElementById('customer-details');
    if (checkoutBtn) checkoutBtn.addEventListener('click', sendOrder);
    if (continueBtn && detailsSection && checkoutBtn) {
      continueBtn.addEventListener('click', () => {
        detailsSection.style.display = 'flex';
        checkoutBtn.style.display = 'block';
        continueBtn.style.display = 'none';
        try { detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      });
    }
    render();

    try {
      window.addEventListener('appSettingsUpdated', () => {
        render();
      });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartPage);
  } else {
    initCartPage();
  }
})();

