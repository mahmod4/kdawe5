(function () {
  function safeParseJSON(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function uniqStrings(arr) {
    return Array.from(new Set((Array.isArray(arr) ? arr : []).map(String)));
  }

  function getCurrentUser() {
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') {
        return window.firebase.auth().currentUser;
      }
    } catch (e) {}
    return null;
  }

  function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'toast-root';
    root.style.position = 'fixed';
    root.style.left = '16px';
    root.style.right = '16px';
    root.style.bottom = '16px';
    root.style.zIndex = '99999';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '10px';
    root.style.pointerEvents = 'none';

    document.body.appendChild(root);
    return root;
  }

  function showToast(message, type) {
    try {
      const root = ensureToastRoot();
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.pointerEvents = 'none';
      toast.style.padding = '12px 14px';
      toast.style.borderRadius = '12px';
      toast.style.fontFamily = "'Tajawal', sans-serif";
      toast.style.fontSize = '14px';
      toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
      toast.style.background = type === 'error' ? '#fee2e2' : type === 'success' ? '#dcfce7' : '#dbeafe';
      toast.style.color = type === 'error' ? '#991b1b' : type === 'success' ? '#166534' : '#1e3a8a';
      toast.style.border = '1px solid rgba(0,0,0,0.06)';

      root.appendChild(toast);
      setTimeout(() => {
        try {
          toast.remove();
        } catch (e) {}
      }, 2200);
    } catch (e) {}
  }

  const FavoritesService = {
    storageKey: 'favorites',
    favorites: [],
    _syncInFlight: null,

    loadFromStorage: function () {
      const raw = localStorage.getItem(this.storageKey);
      const arr = safeParseJSON(raw, []);
      this.favorites = uniqStrings(arr);
    },

    saveToStorage: function () {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
      } catch (e) {}
    },

    isFavorite: function (productId) {
      return this.favorites.includes(String(productId));
    },

    updateFavoriteButtons: function () {
      try {
        document.querySelectorAll('.favorite-btn').forEach((btn) => {
          const id = btn.getAttribute('data-id');
          const fav = this.isFavorite(id);
          btn.classList.toggle('is-favorite', fav);
          btn.setAttribute('aria-pressed', fav ? 'true' : 'false');
          const icon = btn.querySelector('i');
          if (icon) icon.className = fav ? 'fas fa-heart' : 'far fa-heart';
        });
      } catch (e) {}
    },

    setButtonLoading: function (btn, loading) {
      try {
        if (!btn) return;
        btn.disabled = !!loading;
        btn.style.opacity = loading ? '0.75' : '';
        btn.style.pointerEvents = loading ? 'none' : '';
      } catch (e) {}
    },

    _getFirestoreDeps: function () {
      try {
        if (!window.firebase || !window.firebase.firestore || !window.firebaseFirestore) return null;
        const db = window.firebase.firestore();
        return { db, ffs: window.firebaseFirestore };
      } catch (e) {
        return null;
      }
    },

    syncToFirestore: async function () {
      const user = getCurrentUser();
      if (!user) return;

      const deps = this._getFirestoreDeps();
      if (!deps) return;

      if (this._syncInFlight) return this._syncInFlight;

      this._syncInFlight = (async () => {
        const { db, ffs } = deps;
        const userRef = ffs.doc(db, 'users', user.uid);
        await ffs.setDoc(
          userRef,
          {
            favoriteProductIds: this.favorites,
            updatedAt: new Date()
          },
          { merge: true }
        );
      })();

      try {
        await this._syncInFlight;
      } finally {
        this._syncInFlight = null;
      }
    },

    loadFromFirestoreAndMerge: async function () {
      const user = getCurrentUser();
      if (!user) return;

      const deps = this._getFirestoreDeps();
      if (!deps) return;

      const { db, ffs } = deps;
      const userRef = ffs.doc(db, 'users', user.uid);
      const snap = await ffs.getDoc(userRef);
      const cloudFavs = snap && snap.exists && snap.exists() ? snap.data().favoriteProductIds || [] : [];

      this.favorites = uniqStrings([...(Array.isArray(cloudFavs) ? cloudFavs : []), ...this.favorites]);
      this.saveToStorage();
      await this.syncToFirestore();
      this.updateFavoriteButtons();
    },

    toggleFavorite: async function (productId, btnEl) {
      const id = String(productId);
      const wasFavorite = this.isFavorite(id);

      this.setButtonLoading(btnEl, true);

      try {
        if (wasFavorite) {
          this.favorites = this.favorites.filter((x) => x !== id);
        } else {
          this.favorites = uniqStrings([...this.favorites, id]);
        }

        this.saveToStorage();
        this.updateFavoriteButtons();

        try {
          await this.syncToFirestore();
        } catch (syncErr) {
          showToast('تعذر مزامنة المفضلة، تم الحفظ محلياً', 'error');
          return;
        }

        showToast(wasFavorite ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة', 'success');
      } catch (e) {
        showToast('حدث خطأ أثناء تحديث المفضلة', 'error');
      } finally {
        this.setButtonLoading(btnEl, false);
      }
    },

    setupAuthSync: function () {
      try {
        if (window.firebaseAuth && typeof window.firebaseAuth.onAuthStateChanged === 'function' && window.firebase && typeof window.firebase.auth === 'function') {
          window.firebaseAuth.onAuthStateChanged(window.firebase.auth(), (user) => {
            if (user) {
              this.loadFromFirestoreAndMerge().catch(() => {});
            }
          });
        }
      } catch (e) {}
    },

    init: function () {
      this.loadFromStorage();
      this.updateFavoriteButtons();
      this.setupAuthSync();
      
      // تحميل المفضلة من Firestore عند تحميل الصفحة لو المستخدم مسجل دخول
      const user = getCurrentUser();
      if (user) {
        this.loadFromFirestoreAndMerge().catch(() => {});
      }
    }
  };

  window.favoritesService = FavoritesService;
})();
