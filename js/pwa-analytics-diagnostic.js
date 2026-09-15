/* Radar Vacinal ACS — diagnóstico isolado de analytics em PWA standalone */
(function (win, doc) {
  'use strict';

  if (!win || !doc) return;

  function isStandalone() {
    try {
      return (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches) ||
        win.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  }

  function getPlatform() {
    var ua = (win.navigator && win.navigator.userAgent) || '';
    if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'other';
  }

  function alreadySent() {
    try { return win.sessionStorage.getItem('radar_pwa_launch_sent') === '1'; }
    catch (e) { return !!win.__RADAR_PWA_LAUNCH_SENT__; }
  }

  function markSent() {
    try { win.sessionStorage.setItem('radar_pwa_launch_sent', '1'); }
    catch (e) { win.__RADAR_PWA_LAUNCH_SENT__ = true; }
  }

  function trySend(attempt) {
    if (!isStandalone() || alreadySent()) return;

    if (typeof win.gtag === 'function') {
      try {
        win.gtag('event', 'pwa_launch', {
          pwa_platform: getPlatform(),
          display_mode: 'standalone'
        });
        markSent();
      } catch (e) {}
      return;
    }

    if (attempt < 20) {
      win.setTimeout(function () { trySend(attempt + 1); }, 500);
    }
  }

  function start() { trySend(0); }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    win.setTimeout(start, 0);
  }
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
