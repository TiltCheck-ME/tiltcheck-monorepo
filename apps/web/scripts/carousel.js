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
  const indicatorsContainer = document.getElementById('carousel-indicators');

  function createIndicators() {
    if (!indicatorsContainer) return;
    const cards = carousel.querySelectorAll('.tool-card');
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'indicator' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.onclick = () => {
        carousel.scrollTo({
          left: i * (SCROLL_AMOUNT),
          behavior: 'smooth'
        });
      };
      indicatorsContainer.appendChild(dot);
    });
  }

  function updateActiveIndicator() {
    if (!indicatorsContainer) return;
    const scrollPos = carousel.scrollLeft;
    const index = Math.round(scrollPos / SCROLL_AMOUNT);
    const indicators = indicatorsContainer.querySelectorAll('.indicator');
    indicators.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function updateButtons() {
    prevBtn.disabled = carousel.scrollLeft <= 0;
    nextBtn.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1;
    updateActiveIndicator();
  }

  // Swipe support
  let isDown = false;
  let startX;
  let scrollLeft;

  carousel.addEventListener('mousedown', (e) => {
    isDown = true;
    carousel.classList.add('active');
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });
  carousel.addEventListener('mouseleave', () => {
    isDown = false;
  });
  carousel.addEventListener('mouseup', () => {
    isDown = false;
  });
  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 2;
    carousel.scrollLeft = scrollLeft - walk;
  });

  // Touch swipe
  let touchStartX = 0;
  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextBtn.click();
      else prevBtn.click();
    }
  }, { passive: true });

  prevBtn.addEventListener('click', function () {
    carousel.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', function () {
    carousel.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
  });

  carousel.addEventListener('scroll', updateButtons, { passive: true });

  // Initial state
  createIndicators();
  updateButtons();
})();
