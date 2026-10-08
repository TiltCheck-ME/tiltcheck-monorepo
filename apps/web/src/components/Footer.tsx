// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import Link from 'next/link';
import BrandTagline from '@/components/BrandTagline';
import { HOME_LAUNCH } from '@/lib/home-launch-copy';
import { PUBLIC_FOOTER_LINKS } from '@/lib/public-footer';

const Footer = () => {
  const hotlineParts = HOME_LAUNCH.footerDisclaimer.split('1-800-GAMBLER');
  const beforeHotline = hotlineParts[0] ?? '';
  const afterHotline = hotlineParts[1] ?? '';
  const ncpgParts = afterHotline.split('NCPG.org');
  const beforeNcpg = ncpgParts[0] ?? '';
  const afterNcpg = ncpgParts[1] ?? '';

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-shell">
        <div className="footer-bottom">
          <p className="footer-copy">
            {beforeHotline}
            <strong>1-800-GAMBLER</strong>
            {beforeNcpg}
            <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">
              NCPG.org
            </a>
            {afterNcpg}
          </p>
          <div className="footer-bottom-links">
            {PUBLIC_FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <p className="footer-tagline">
            <BrandTagline />
          </p>
          <p className="footer-copyright">© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
