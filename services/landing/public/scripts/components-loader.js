/* Shared component loader: injects nav & footer, emits event */
(function(){
  const navMount = document.getElementById('shared-nav');
  const footerMount = document.getElementById('shared-footer');
  const fetchInject = (path, mount) => fetch(path)
    .then(r => r.ok ? r.text() : '')
    .then(html => { if (html) mount.innerHTML = html; })
    .catch(()=>{});

  if (navMount) fetchInject('/components/nav.html', navMount);
  if (footerMount) fetchInject('/components/footer.html', footerMount);

  // Fire a global event so auth or other scripts can react
  document.dispatchEvent(new CustomEvent('tc:componentsLoaded'));
})();
