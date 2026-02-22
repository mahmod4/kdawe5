(function () {
  function toNumber(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeString(v, fallback) {
    const s = (v == null ? '' : String(v)).trim();
    return s ? s : fallback;
  }

  function normalizeItems(cartItems) {
    const arr = Array.isArray(cartItems) ? cartItems : [];
    return arr
      .map((it) => {
        const quantity = toNumber(it && it.quantity != null ? it.quantity : 1, 1);
        const price = toNumber(it && it.price != null ? it.price : 0, 0);
        return {
          id: it && it.id != null ? String(it.id) : '',
          name: safeString(it && (it.name || it.productName), 'منتج'),
          price,
          quantity,
          selectedWeight: typeof (it && it.selectedWeight) !== 'undefined' ? it.selectedWeight : null,
          image: it && it.image ? String(it.image) : ''
        };
      })
      .filter((it) => it.name);
  }

  function getCurrentUser() {
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') {
        return window.firebase.auth().currentUser;
      }
    } catch (e) {}
    return null;
  }

  async function upsertUserDoc(db, ffs, user, now, extra) {
    try {
      const userRef = ffs.doc(db, 'users', user.uid);
      const userSnap = await ffs.getDoc(userRef);

      const baseData = {
        name: (extra && extra.customer && extra.customer.name) || user.displayName || null,
        email: user.email || null,
        phone: (extra && extra.customer && extra.customer.phone) || user.phoneNumber || null,
        active: true,
        updatedAt: now
      };

      if (userSnap.exists()) {
        await ffs.updateDoc(userRef, baseData);
      } else {
        await ffs.setDoc(userRef, { ...baseData, createdAt: now });
      }
    } catch (e) {
      console.error('Failed to upsert user doc:', e);
    }
  }

  const OrderService = {
    async saveOrder(userId, cartItems, total, extra) {
      if (!userId) throw new Error('بيانات المستخدم غير صالحة');

      const items = normalizeItems(cartItems);
      if (!items.length) throw new Error('السلة فارغة');

      const safeTotal = toNumber(total, NaN);
      if (!Number.isFinite(safeTotal) || safeTotal <= 0) throw new Error('إجمالي الطلب غير صالح');

      if (!window.firebase || !window.firebaseFirestore || !window.firebase.firestore) {
        throw new Error('Firebase غير مهيأ');
      }

      const db = window.firebase.firestore();
      const ffs = window.firebaseFirestore;
      const now = new Date();

      try {
        const user = getCurrentUser();
        if (user && user.uid) {
          await upsertUserDoc(db, ffs, user, now, extra);
        }
      } catch (e) {
      }

      const orderData = {
        userId: String(userId),
        customerId: String(userId),
        items,
        total: safeTotal,
        status: 'pending',
        createdAt: now,
        orderDate: now,
        timestamp: Date.now(),
        orderItems: items,
        totalPrice: safeTotal
      };

      const docRef = await ffs.addDoc(ffs.collection(db, 'orders'), orderData);
      return docRef && docRef.id ? docRef.id : null;
    },

    async saveOrderForCurrentUser(cartItems, total, extra) {
      const user = getCurrentUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');
      return this.saveOrder(user.uid, cartItems, total, extra);
    }
  };

  window.orderService = OrderService;

  window.saveOrderToFirebase = async function (cartItems, totalPrice) {
    return OrderService.saveOrderForCurrentUser(cartItems, totalPrice);
  };
})();
