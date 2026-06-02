// صورة رمادية بسيطة عند عدم وجود صورة للمنتج ولا صورة افتراضية من الإعدادات
(function () {
  'use strict';

  /** SVG صالح كـ data URL (بدون base64 معطوب) — يمنع net::ERR_INVALID_URL */
  function buildPlaceholderDataUrl() {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#e5e7eb"/>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var PLACEHOLDER = buildPlaceholderDataUrl();

  function trimUrl(url) {
    if (url == null) return '';
    var s = String(url).trim();
    return s;
  }

  window.PRODUCT_IMAGE_PLACEHOLDER_DATA_URL = PLACEHOLDER;

  /** يعيد رابط الصورة الفعلي أو رابط الصورة الافتراضية من الإعدادات، أو سلسلة فارغة */
  window.resolveProductImageUrl = function (url) {
    var u = trimUrl(url);
    if (u) return u;
    try {
      var a = window.APP_SETTINGS && window.APP_SETTINGS.DEFAULT_PRODUCT_IMAGE;
      var t = trimUrl(a);
      if (t) return t;
    } catch (e) {}
    try {
      var st =
        window.siteSettings &&
        window.siteSettings.store &&
        window.siteSettings.store.defaultProductImage;
      return trimUrl(st);
    } catch (e2) {}
    return '';
  };

  /** للعرض في واجهة المتجر: صورة المنتج أو الافتراضية أو placeholder */
  window.getProductImageDisplayUrl = function (url) {
    var r = window.resolveProductImageUrl(url);
    return r || PLACEHOLDER;
  };

  /**
   * عند فشل تحميل صورة منتج/عرض: جرّب الصورة الافتراضية من الإعدادات ثم placeholder الصالح.
   * يزيل حلقات onerror ورسائل الخطأ من data URL غير صالح.
   */
  window.onProductImageError = function (img) {
    if (!img || img.nodeName !== 'IMG') return;
    img.onerror = null;
    var step = parseInt(img.dataset.productImgFallback || '0', 10) || 0;
    if (step === 0) {
      var def = '';
      try {
        def = window.resolveProductImageUrl ? window.resolveProductImageUrl('') : '';
      } catch (e) {}
      if (def && img.src !== def) {
        img.dataset.productImgFallback = '1';
        img.src = def;
        img.onerror = function () {
          window.onProductImageError(img);
        };
        return;
      }
    }
    img.dataset.productImgFallback = '2';
    img.src = PLACEHOLDER;
  };
})();
