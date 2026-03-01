(function () {
  function getParam(name) {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get(name);
    } catch (e) {
      return null;
    }
  }

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  function formatPrice(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return '';
    return x % 1 === 0 ? String(x) : x.toFixed(2);
  }

  function getWeightUnit(product) {
    try {
      if (window.weightService && typeof window.weightService.getWeightUnit === 'function') {
        return window.weightService.getWeightUnit(product);
      }
    } catch (e) {}
    try {
      if (product && product.weightUnit) return String(product.weightUnit);
      if (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightUnit) {
        return String(window.siteSettings.store.weightUnit);
      }
    } catch (e) {}
    return 'كجم';
  }

  function getWeightOptions(product) {
    try {
      if (window.weightService && typeof window.weightService.getOptions === 'function') {
        return window.weightService.getOptions(product);
      }
    } catch (e) {}

    const unit = getWeightUnit(product);
    const opts = [];
    const min = (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightMin) ? Number(window.siteSettings.store.weightMin) : 0.125;
    const max = (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightMax) ? Number(window.siteSettings.store.weightMax) : 1;
    const inc = (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightIncrement) ? Number(window.siteSettings.store.weightIncrement) : 0.125;
    for (let w = min; w <= max + 1e-9; w += inc) {
      opts.push({ value: Number(w.toFixed(6)), label: `${w} ${unit}` });
    }
    return opts;
  }

  function shareProduct(product) {
    if (!product || !product.id) return;
    const url = `${window.location.origin}${window.location.pathname}?id=${product.id}`;
    const text = `شاهد هذا المنتج: ${product.name || ''} - ${url}`;
    
    if (navigator.share) {
      navigator.share({ title: product.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        try {
          if (typeof window.showToast === 'function') {
            window.showToast('تم نسخ الرابط', 'success');
          }
        } catch (e) {}
      }).catch(() => {});
    }
  }

  async function loadSimilarProducts(currentProduct) {
    if (!currentProduct || !currentProduct.category) return;
    
    let allProducts = [];
    try {
      if (Array.isArray(window.products)) allProducts = window.products;
      else if (Array.isArray(window.productsArray)) allProducts = window.productsArray;
      else {
        const cached = localStorage.getItem('products_cache');
        if (cached) allProducts = JSON.parse(cached);
      }
    } catch (e) {}

    if (!Array.isArray(allProducts)) return;

    const similar = allProducts.filter(p => 
      String(p.id) !== String(currentProduct.id) &&
      String(p.category || p.categoryId || '') === String(currentProduct.category) &&
      p.stock !== false
    ).slice(0, 6);

    renderSimilarProducts(similar);
  }

  function renderSimilarProducts(products) {
    const section = document.getElementById('similar-products-section');
    const container = document.getElementById('similar-products-container');
    if (!section || !container) return;

    if (!products || products.length === 0) {
      section.style.display = 'none';
      return;
    }

    container.innerHTML = products.map(product => {
      const price = (product.discountPrice && product.discountPrice < product.price) ? Number(product.discountPrice) : Number(product.price);
      return `
        <div class="product" style="border:1px solid #eee; border-radius:12px; padding:12px; cursor:pointer;" onclick="window.location.href='product.html?id=${product.id}'">
          <img src="${product.image || ''}" alt="${product.name || ''}" style="width:100%; height:140px; object-fit:cover; border-radius:8px; background:#fafafa;" onerror="this.style.display='none'" />
          <h4 style="margin:8px 0 4px; font-size:14px;">${product.name || ''}</h4>
          <p style="margin:0; font-weight:bold; color:#2c3e50;">${formatPrice(price)} ج.م</p>
        </div>
      `;
    }).join('');

    section.style.display = 'block';
  }

  async function fetchProductFromFirestore(productId) {
    if (!window.firebase || !window.firebaseFirestore || !window.firebase.firestore) {
      return null;
    }
    const db = window.firebase.firestore();
    const ref = window.firebaseFirestore.doc(db, 'products', String(productId));
    const snap = await window.firebaseFirestore.getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    return {
      id: String(snap.id),
      name: data.name || '',
      category: data.category || data.categoryId || '',
      image: data.image || '',
      price: parseFloat(data.price) || 0,
      soldByWeight: data.soldByWeight === true || data.hasWeightOptions === true,
      weight: (typeof data.weight === 'number' ? data.weight : null),
      weightUnit: data.weightUnit || null,
      stock: data.available !== false,
      description: data.description || '',
      hasWeightOptions: data.hasWeightOptions || false,
      discountPrice: data.discountPrice || null
    };
  }

  function findProductLocal(productId) {
    try {
      if (Array.isArray(window.products)) {
        const p = window.products.find(x => String(x.id) === String(productId));
        if (p) return p;
      }
      if (Array.isArray(window.productsArray)) {
        const p = window.productsArray.find(x => String(x.id) === String(productId));
        if (p) return p;
      }
    } catch (e) {}

    try {
      const cached = localStorage.getItem('products_cache');
      if (cached) {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr)) {
          const p = arr.find(x => String(x.id) === String(productId));
          if (p) return p;
        }
      }
    } catch (e) {}

    return null;
  }

  function renderProduct(product) {
    const titleEl = document.getElementById('product-title');
    const wrap = document.getElementById('product-details');
    if (titleEl) titleEl.textContent = product && product.name ? product.name : 'تفاصيل المنتج';
    if (!wrap) return;

    if (!product) {
      wrap.innerHTML = '<p>المنتج غير موجود.</p>';
      return;
    }

    const unit = getWeightUnit(product);
    const price = (product.discountPrice && product.discountPrice < product.price) ? Number(product.discountPrice) : Number(product.price);

    wrap.innerHTML = `
      <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start;">
        <div style="flex:1; min-width:240px; max-width:380px;">
          <img src="${product.image || ''}" alt="${product.name || ''}" style="width:100%; border-radius:12px; border:1px solid #eee; background:#fafafa;" onerror="this.style.display='none'" />
        </div>
        <div style="flex:2; min-width:260px;">
          <h3 style="margin:0 0 8px;">${product.name || ''}</h3>
          ${product.description ? `<p style="margin:0 0 10px; color:#444;">${product.description}</p>` : ''}
          <p style="margin:0 0 12px;"><strong>السعر:</strong> ${formatPrice(price)} ج.م</p>

          <div id="weight-box" style="margin:0 0 12px; display:none;"></div>

          <button id="add-to-cart-btn" class="btn" style="width:100%;" ${product.stock === false ? 'disabled' : ''}>
            ${product.stock === false ? 'غير متوفر' : 'إضافة للسلة'}
          </button>
        </div>
      </div>
    `;

    let selectedWeight = null;

    if (product.soldByWeight) {
      const weightBox = document.getElementById('weight-box');
      if (weightBox) {
        weightBox.style.display = 'block';
        const options = getWeightOptions(product);
        weightBox.innerHTML = `
          <label style="display:block; margin-bottom:6px;">الوزن</label>
          <select id="weight-select" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
            ${options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
          </select>
          <small style="display:block; margin-top:6px; color:#666;">الوحدة: ${unit}</small>
        `;

        const select = document.getElementById('weight-select');
        if (select) {
          selectedWeight = Number(select.value);
          select.addEventListener('change', () => {
            selectedWeight = Number(select.value);
          });
        }
      }
    }

    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (product.stock === false) return;

        const cart = readCart();
        const entry = {
          id: String(product.id),
          name: String(product.name || ''),
          image: String(product.image || ''),
          price: price,
          quantity: 1
        };

        if (product.soldByWeight) {
          entry.selectedWeight = Number.isFinite(selectedWeight) ? selectedWeight : 0.125;
          entry.soldByWeight = true;
          entry.weightUnit = product.weightUnit || null;
        } else {
          entry.selectedWeight = null;
          entry.soldByWeight = false;
        }

        const idx = cart.findIndex(i => String(i.id) === String(entry.id) && Number(i.selectedWeight) === Number(entry.selectedWeight));
        if (idx >= 0) {
          cart[idx].quantity = (Number(cart[idx].quantity) || 0) + 1;
        } else {
          cart.push(entry);
        }
        writeCart(cart);

        try {
          if (typeof window.showToast === 'function') {
            window.showToast('تمت الإضافة للسلة', 'success');
          }
        } catch (e) {}
      });
    }

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => shareProduct(product));
    }

    loadSimilarProducts(product);
  }

  async function init() {
    const productId = getParam('id');
    if (!productId) {
      renderProduct(null);
      return;
    }

    let product = findProductLocal(productId);
    if (!product) {
      try {
        product = await fetchProductFromFirestore(productId);
      } catch (e) {
        product = null;
      }
    }

    renderProduct(product);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
