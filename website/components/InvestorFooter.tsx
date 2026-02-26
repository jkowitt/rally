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
              <li><span>Rally</span></li>
              <li><span>Business Now</span></li>
              <li><span>Valora</span></li>
              <li><span>Legacy CRM</span></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Coverage</h4>
            <ul className="footer-links">
              <li><span>College (353+ Schools)</span></li>
              <li><span>NBA, NFL, MLB</span></li>
              <li><span>NHL, MLS, UWSL</span></li>
              <li><span>520+ Total Teams</span></li>
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
            &copy; {new Date().getFullYear()} Loud Legacy Ventures. All rights reserved.
          </p>
        </div>
        <div className="footer-contact-line">
          Contact jason@loud-legacy.com for more information
        </div>
      </div>
    </footer>
  );
};

export default InvestorFooter;
