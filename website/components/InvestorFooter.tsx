import Link from "next/link";

const InvestorFooter = () => {
  return (
    <footer className="footer investor-footer">
      <div className="container footer-content">
        <div className="footer-grid">
          <div className="footer-section footer-brand">
            <div className="investor-footer-logo">
              <span className="investor-footer-logo-text">LOUD LEGACY</span>
              <span className="investor-footer-logo-sub">VENTURES</span>
            </div>
            <p className="footer-tagline">
              Behavioral data infrastructure company building the identity layer for the physical world, starting with sports.
            </p>
            <p className="investor-footer-motto">
              Prove you were there.
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Ecosystem</h4>
            <ul className="footer-links">
              <li><Link href="/rally">Rally</Link></li>
              <li><Link href="/business-now">Business Now</Link></li>
              <li><Link href="/valora">Legacy RE</Link></li>
              <li><Link href="/legacy-crm">Legacy CRM</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Coverage</h4>
            <ul className="footer-links">
              <li><Link href="/leagues">College (353+ Schools)</Link></li>
              <li><Link href="/leagues">NBA, NFL, MLB</Link></li>
              <li><Link href="/leagues">NHL, MLS, UWSL</Link></li>
              <li><Link href="/leagues">520+ Total Teams</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li><Link href="/why-loud-legacy">About</Link></li>
              <li><Link href="/contact">Contact / Invest</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Loud Legacy Ventures. All rights reserved.
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

export default InvestorFooter;
