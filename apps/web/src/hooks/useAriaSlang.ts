'use client';

import { useEffect } from 'react';

const slangMap: { [key: string]: string } = {
  'HOUSE ALWAYS WINS?': 'The casino has a mathematical advantage',
  'your dopamine is cooked.': 'Your decision-making may be compromised',
  'LOCK PROFITS': 'Move winnings to secure cold storage',
  'VERIFY THE DRIFT': 'Verify statistical fairness drift',
  'plug in.': 'Install and activate the extension',
  'the pulse.': 'Monitor real-time betting signals',
  'touch grass.': 'Take a break from gambling',
  'DEGEN_OS': 'Degen Operating System',
  'vibe check': 'System confidence assessment',
};

export const useAriaSlang = () => {
  useEffect(() => {
    const applyAriaLabels = () => {
      const elements = document.querySelectorAll('[data-slang]');
      elements.forEach(el => {
        const slang = el.getAttribute('data-slang');
        // Check if the element is an HTMLElement to access dataset
        if (slang && el instanceof HTMLElement && !el.getAttribute('aria-label')) {
          const accessibleText = slangMap[slang];
          if (accessibleText) {
            el.setAttribute('aria-label', accessibleText);
          }
        }
      });
    };

    // Apply on initial mount
    applyAriaLabels();

    // Re-apply if the DOM changes (e.g., after client-side navigation)
    // A more robust solution might use MutationObserver, but this is good for now.
    const observer = new MutationObserver(applyAriaLabels);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);
};
