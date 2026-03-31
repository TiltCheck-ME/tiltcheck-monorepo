'use client';

import { useState, useEffect } from 'react';

const phrases = [
  "Someone just cashed out at +4x and actually kept it. We love to see it.",
  "RNG drift flagged on a major platform. Someone's math wasn't mathing. Entry blocked.",
  "1.5 SOL moved to cold storage automatically. You can't bet what you can't reach.",
  "Fake bonus site nuked before anyone clicked it. 8 wallets saved. You're welcome.",
  "Three people hit their own loss limit and walked away. That takes guts. Respect.",
  "House edge quietly increased on a live table. We noticed. You would've lost more.",
  "Odds check complete on three platforms. Two came back clean. One... did not.",
  "12 people kept their bag tonight. Probably the best decision they made all week.",
  "Session running 3 hours? Your brain thinks it's sharper than it is right now. Just saying.",
  "Scam domain flagged: looks exactly like the real thing. That's the point. Stay sharp."
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
