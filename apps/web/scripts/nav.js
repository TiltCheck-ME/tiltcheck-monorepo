/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/* Shared nav behavior: tools dropdown + mobile menu */
(function () {
  const toolsBtn = document.getElementById('tools-menu-btn');
  const toolsMenu = document.getElementById('tools-menu');
  if (toolsBtn && toolsMenu) {
    const closeTools = () => {
      toolsBtn.setAttribute('aria-expanded', 'false');
      toolsMenu.style.display = '';
    };

    toolsBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const expanded = toolsBtn.getAttribute('aria-expanded') === 'true';
      toolsBtn.setAttribute('aria-expanded', String(!expanded));
      toolsMenu.style.display = expanded ? '' : 'block';
    });

    document.addEventListener('click', closeTools);
    toolsMenu.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeTools();
        toolsBtn.focus();
      }
    });
  }

  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav-panel');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(open));
      if (open) {
        mobileNav.removeAttribute('hidden');
        mobileNav.classList.add('open');
      } else {
        mobileNav.classList.remove('open');
        setTimeout(() => mobileNav.setAttribute('hidden', ''), 300);
      }
    });
  }
})();
