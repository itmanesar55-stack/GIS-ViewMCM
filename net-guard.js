// Registers sw.js (retries requests through short internet drops) and shows a small notice while it is retrying.
(function () {
  if (!('serviceWorker' in navigator) || !window.isSecureContext || location.hostname.endsWith('github.io')) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  let banner = null, hideTimer = null;
  function show(text, color) {
    if (!banner) {
      banner = document.createElement('div');
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:100000;max-width:calc(100vw - 32px);' +
        'padding:8px 14px;border-radius:6px;color:#fff;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)';
      document.body.appendChild(banner);
    }
    clearTimeout(hideTimer);
    banner.textContent = text; banner.style.background = color; banner.style.display = 'block';
  }
  navigator.serviceWorker.addEventListener('message', event => {
    const state = event.data && event.data.type === 'net-guard' && event.data.state;
    if (state === 'retrying') show('Internet connection interrupted - reconnecting…', '#b26a00');
    else if (state === 'ok') { show('Reconnected', '#2e7d32'); hideTimer = setTimeout(() => { banner.style.display = 'none'; }, 2500); }
    else if (state === 'failed') show('Server still unreachable - please try again in a minute.', '#b83232');
  });
})();
