(function () {
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
      toast.textContent = String(message || '');
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
      }, 2400);
    } catch (e) {}
  }

  window.showToast = showToast;
})();
