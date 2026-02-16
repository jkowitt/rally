import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className="footer rally-footer">
      <div className="container footer-content">
        <div className="footer-grid">
          <div className="footer-section footer-brand">
            <Image
              src="/logos/rally-logo-transparent-white.png"
              alt="Rally"
              width={120}
              height={30}
              className="footer-rally-logo"
            />
            <p className="footer-tagline">
              The sports community app where fans earn rewards for showing up, engaging, and being loyal.
            </p>
            <p className="footer-vw">
              Built by Loud Legacy
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Rally</h4>
            <ul className="footer-links">
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/rewards">Rewards & Tiers</Link></li>
              <li><Link href="/leagues">Browse Leagues</Link></li>
              <li><Link href="/auth/signup">Join Free</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Community</h4>
            <ul className="footer-links">
              <li><Link href="/leagues">College</Link></li>
              <li><Link href="/leagues">NBA &middot; NFL &middot; MLB</Link></li>
              <li><Link href="/leagues">NHL &middot; MLS &middot; UWSL</Link></li>
              <li><Link href="/for-properties">For Teams & Properties</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li><Link href="/why-loud-legacy">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Rally by Loud Legacy. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
