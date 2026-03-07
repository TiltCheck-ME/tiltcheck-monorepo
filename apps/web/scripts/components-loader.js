/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/* Shared component loader: injects nav & footer, emits event */
(function(){
  const navMount = document.getElementById('shared-nav');
  const footerMount = document.getElementById('shared-footer');
  const fetchInject = (path, mount) => fetch(path)
    .then(r => r.ok ? r.text() : '')
    .then(html => { if (html) mount.innerHTML = html; })
    .catch(()=>{});

  const tasks = [];
  if (navMount) tasks.push(fetchInject('/components/nav.html', navMount));
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
