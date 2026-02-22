(function () {
  function loadRuntimeEnvSync() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/.netlify/functions/runtime-env', false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        window.RUNTIME_ENV = data && typeof data === 'object' ? data : {};
        return;
      }
    } catch (e) {
    }
    window.RUNTIME_ENV = window.RUNTIME_ENV || {};
  }

  loadRuntimeEnvSync();
})();
