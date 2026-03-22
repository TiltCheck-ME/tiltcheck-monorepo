'use client';

import { useState, useEffect } from 'react';

const phrases = [
  "DEMO: Session Stats reveal you've been revenge-betting for 3 hours. Take the win. Go to bed.",
  "DEMO: RNG Audit: Hash drift detected on Stake.com. The house is cooking the math. Entry blocked.",
  "DEMO: Auto-Vault: 1.5 SOL profit moved to cold storage. You can't bet what you can't reach.",
  "DEMO: Domain Verifier: Fake roobet-bonus.net clone nuked. 8 souls saved from a wallet drain.",
  "DEMO: TILT LOCK: 3 users just hit their loss limit. Browser frozen. Go outside. Seriously.",
  "DEMO: Session Stats: House edge increased on BJ Evolution. Don't be a statistic. Sit out.",
  "DEMO: RNG Audit: Parity verified on Shuffle. The math is clean. Continue at your own risk.",
  "DEMO: ENFORCED DISCIPLINE: 12 users moved winnings to cold storage. Bags secured."
];

export const useTypewriter = () => {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const type = () => {
      const currentPhrase = phrases[phraseIndex];
      let delay = isDeleting ? 20 : 50;

      if (isDeleting) {
        setText(currentPhrase.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else {
        setText(currentPhrase.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }

      if (!isDeleting && charIndex === currentPhrase.length) {
        delay = 3500;
        setIsDeleting(true);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        delay = 800;
      }

      const timer = setTimeout(type, delay);
      return () => clearTimeout(timer);
    };

    const timer = setTimeout(type, 1000); // Initial delay
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phraseIndex]);

  return text;
};
