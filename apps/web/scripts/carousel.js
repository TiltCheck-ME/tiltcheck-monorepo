/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Tools carousel — keyboard-accessible prev/next scroll controls.
 */
(function () {
  const carousel = document.getElementById('tools-carousel');
  const prevBtn  = document.getElementById('carousel-prev');
  const nextBtn  = document.getElementById('carousel-next');

  if (!carousel || !prevBtn || !nextBtn) return;

  var SCROLL_AMOUNT = 320;

  function updateButtons() {
    prevBtn.disabled = carousel.scrollLeft <= 0;
    nextBtn.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1;
  }

  prevBtn.addEventListener('click', function () {
    carousel.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', function () {
    carousel.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
  });

  carousel.addEventListener('scroll', updateButtons, { passive: true });

  // Initial state
  updateButtons();
})();
