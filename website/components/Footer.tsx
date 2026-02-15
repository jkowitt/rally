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
              The fan engagement and loyalty platform built for sports properties across every league.
            </p>
            <p className="footer-vw">
              Built by Loud Legacy
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Platform</h4>
            <ul className="footer-links">
              <li><Link href="/platform">Platform Overview</Link></li>
              <li><Link href="/#platform">Capabilities</Link></li>
              <li><Link href="/#how-it-works">How It Works</Link></li>
              <li><Link href="/use-cases">Use Cases</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Solutions</h4>
            <ul className="footer-links">
              <li><Link href="/solutions/college">College Athletics</Link></li>
              <li><Link href="/solutions/professional">Professional Sports</Link></li>
              <li><Link href="/solutions/entertainment">Entertainment & Events</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li><Link href="/why-loud-legacy">About</Link></li>
              <li><Link href="/contact">Contact & Demo</Link></li>
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
