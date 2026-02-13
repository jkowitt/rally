import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <main>
      <Header />

      <section className="not-found-page">
        <div className="container">
          <div className="not-found-content">
            <span className="not-found-code">404</span>
            <h1>Page not found</h1>
            <p>
              The page you're looking for doesn't exist or has been moved.
              Let's get you back on track.
            </p>

            <div className="not-found-actions">
              <Link href="/" className="button button--primary">
                Go home
              </Link>
              <Link href="/contact" className="button button--secondary">
                Contact us
              </Link>
            </div>

            <div className="not-found-suggestions">
              <h2>Popular pages</h2>
              <nav aria-label="Popular pages">
                <ul>
                  <li><Link href="/pricing">Pricing</Link></li>
                  <li><Link href="/about">About us</Link></li>
                  <li><Link href="/valora">Legacy RE</Link></li>
                  <li><Link href="/sportify">Sportify</Link></li>
                  <li><Link href="/business-now">Business Now</Link></li>
                  <li><Link href="/legacy-crm">Legacy CRM</Link></li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
