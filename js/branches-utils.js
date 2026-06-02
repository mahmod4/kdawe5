/**
 * فروع المتجر — روابط خرائط Google (بدون مفتاح API)
 * يدعم: رابط المشاركة من خرائط جوجل، أو خط عرض/طول، أو البحث بالعنوان
 */
(function () {
  'use strict';

  function trim(s) {
    return s == null ? '' : String(s).trim();
  }

  /** رابط لفتح الموقع في تطبيق/متصفح خرائط Google */
  window.resolveBranchMapsUrl = function (b) {
    if (!b || typeof b !== 'object') return '';
    var u = trim(b.mapsUrl);
    if (/^https?:\/\//i.test(u)) return u;

    var lat = Number(b.lat);
    var lng = Number(b.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lat + ',' + lng);
    }

    var addr = trim(b.address);
    var name = trim(b.name);
    var q = addr || name;
    if (q) {
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    }
    return '';
  };

  /**
   * رابط تضمين بسيط (iframe) — يعمل بدون مفتاح API في أغلب الحالات
   */
  window.resolveBranchEmbedUrl = function (b) {
    if (!b || typeof b !== 'object') return '';
    var lat = Number(b.lat);
    var lng = Number(b.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return (
        'https://maps.google.com/maps?q=' +
        encodeURIComponent(lat + ',' + lng) +
        '&hl=ar&z=16&output=embed'
      );
    }
    var addr = trim(b.address);
    var name = trim(b.name);
    var q = addr || name;
    if (q) {
      return (
        'https://maps.google.com/maps?q=' +
        encodeURIComponent(q) +
        '&hl=ar&z=15&output=embed'
      );
    }
    return '';
  };

  window.isBranchRenderable = function (b) {
    if (!b || typeof b !== 'object') return false;
    if (trim(b.name) || trim(b.address) || trim(b.mapsUrl)) return true;
    var lat = Number(b.lat);
    var lng = Number(b.lng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  };
})();
