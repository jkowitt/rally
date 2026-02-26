const Footer = () => {
  return (
    <footer className="footer rally-footer">
      <div className="container footer-content">
        <div className="footer-grid">
          <div className="footer-section footer-brand">
            <span className="footer-logo-text">Rally</span>
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
              <li><span>How It Works</span></li>
              <li><span>Rewards &amp; Tiers</span></li>
              <li><span>Browse Leagues</span></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Community</h4>
            <ul className="footer-links">
              <li><span>College</span></li>
              <li><span>NBA &middot; NFL &middot; MLB</span></li>
              <li><span>NHL &middot; MLS &middot; UWSL</span></li>
              <li><span>For Teams &amp; Properties</span></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li><span>About</span></li>
              <li><span>Privacy Policy</span></li>
              <li><span>Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Rally by Loud Legacy. All rights reserved.
          </p>
        </div>
        <div className="footer-contact-line">
          Contact jason@loud-legacy.com for more information
        </div>
      </div>
    </footer>
  );
};

export default Footer;
