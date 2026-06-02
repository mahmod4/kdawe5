(function () {
  function loadRuntimeEnvSync() {
    const endpoints = [
      '/.netlify/functions/runtime-env',
      '/api/runtime-env'
    ];
    try {
      for (let i = 0; i < endpoints.length; i += 1) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', endpoints[i], false);
        xhr.send(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          window.RUNTIME_ENV = data && typeof data === 'object' ? data : {};
          return;
        }
      }
    } catch (e) {
    }
    window.RUNTIME_ENV = window.RUNTIME_ENV || {};
  }

  loadRuntimeEnvSync();
})();
