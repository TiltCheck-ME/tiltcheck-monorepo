/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/* Shared component loader: injects nav & footer, emits event */
(function(){
  const navMount = document.getElementById('shared-nav');
  const footerMount = document.getElementById('shared-footer');
  const hasExistingPrimaryNav = () => {
    // Guard against stacked headers when a page already ships its own primary nav.
    const stickyHeaderNav = document.querySelector('body > header.sticky.top-0.z-50 nav');
    if (stickyHeaderNav) return true;

    const topLevelNavs = Array.from(document.querySelectorAll('body > nav, body > header nav'));
    return topLevelNavs.some((navEl) => {
      if (navMount && navMount.contains(navEl)) return false;
      return Boolean(
        navEl.querySelector('a[href="/casinos.html"], a[href="/trust-scores.html"], a[href="/dashboard"], a[href="/login.html"]')
      );
    });
  };
  const fetchInject = (path, mount) => fetch(path)
    .then(r => r.ok ? r.text() : '')
    .then(html => { if (html) mount.innerHTML = html; })
    .catch(()=>{});

  const loadScriptOnce = (src) => {
    if (document.querySelector(`script[data-tc-src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.tcSrc = src;
    document.body.appendChild(script);
  };

  const tasks = [];
  if (navMount && !hasExistingPrimaryNav()) {
    tasks.push(fetchInject('/components/nav.html', navMount).then(() => loadScriptOnce('/scripts/nav.js')));
  }
  if (footerMount) tasks.push(fetchInject('/components/footer.html', footerMount));

  Promise.all(tasks).finally(() => {
    // Fire a global event so auth or other scripts can react
    document.dispatchEvent(new CustomEvent('tc:componentsLoaded'));
  });

  // Register service worker on any page that loads shared components.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Unified PWA install prompt trigger.
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    window.dispatchEvent(new CustomEvent('tc:pwaInstallAvailable'));
  });

  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-install-pwa]');
    if (!trigger || !deferredPrompt) return;

    event.preventDefault();
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
})();
