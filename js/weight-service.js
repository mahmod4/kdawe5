(function () {
  function safeParseJSON(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function uniqNumbers(arr) {
    const out = [];
    const seen = new Set();
    (Array.isArray(arr) ? arr : []).forEach((v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return;
      const key = String(n);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(n);
    });
    out.sort((a, b) => a - b);
    return out;
  }

  const WeightService = {
    storageKey: 'weightSettings',
    settings: {
      min: 0.125,
      max: 1,
      increment: 0.125,
      options: [0.125, 0.25, 0.5, 0.75, 1],
      unit: 'كجم'
    },

    getWeightUnit: function (product) {
      try {
        if (product && product.weightUnit) return String(product.weightUnit);
        if (this.settings && this.settings.unit) return String(this.settings.unit);
        if (window.siteSettings && window.siteSettings.store && window.siteSettings.store.weightUnit) {
          return String(window.siteSettings.store.weightUnit);
        }
      } catch (e) {}
      return 'كجم';
    },

    formatWeightValue: function (value) {
      const n = Number(value);
      if (Number.isNaN(n)) return '';
      if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
      return String(n);
    },

    loadSettings: async function () {
      const saved = safeParseJSON(localStorage.getItem(this.storageKey), null);
      if (saved && typeof saved === 'object') {
        const min = toNumber(saved.min, this.settings.min);
        const max = toNumber(saved.max, this.settings.max);
        const increment = toNumber(saved.increment, this.settings.increment);
        const options = uniqNumbers(saved.options || this.settings.options);
        const unit = saved.unit ? String(saved.unit) : this.settings.unit;
        this.settings = {
          min: min,
          max: max,
          increment: increment,
          options: options.length ? options : this.settings.options,
          unit
        };
      }

      try {
        let attempts = 0;
        while (!window.siteSettings && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          attempts++;
        }

        if (window.siteSettings && window.siteSettings.store) {
          const store = window.siteSettings.store;
          const min = toNumber(store.weightMin, this.settings.min);
          const max = toNumber(store.weightMax, this.settings.max);
          const increment = toNumber(store.weightIncrement, this.settings.increment);
          const options = uniqNumbers(store.weightOptions || this.settings.options);
          const unit = store.weightUnit ? String(store.weightUnit) : this.settings.unit;

          this.settings = {
            min,
            max,
            increment,
            options: options.length ? options : this.settings.options,
            unit
          };

          this.saveSettingsToStorage();
        }
      } catch (e) {
        console.warn('Failed to load weight settings from siteSettings:', e);
      }
    },

    saveSettingsToStorage: function () {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      } catch (e) {}
    },

    getOptions: function (product) {
      const unit = this.getWeightUnit(product);
      const opts = uniqNumbers(this.settings.options);
      const min = toNumber(this.settings.min, 0.125);
      const max = toNumber(this.settings.max, 1);

      const final = opts.length ? opts : [min, max].filter((n) => Number.isFinite(n) && n > 0);

      return final
        .filter((w) => w >= min && w <= max)
        .map((w) => ({
          value: w,
          label: `${this.formatWeightValue(w)} ${unit}`
        }));
    },

    clampWeight: function (weight) {
      const w = toNumber(weight, this.settings.min);
      const min = toNumber(this.settings.min, 0.125);
      const max = toNumber(this.settings.max, 1);
      return clamp(w, min, max);
    },

    calculatePrice: function (basePrice, weight) {
      const p = toNumber(basePrice, 0);
      const w = toNumber(weight, 1);
      return p * w;
    }
  };

  window.weightService = WeightService;

  (async function initWeightService() {
    try {
      await WeightService.loadSettings();
      console.log('WeightService loaded with settings:', WeightService.settings);
    } catch (e) {
      console.warn('Failed to initialize WeightService:', e);
    }
  })();
})();
