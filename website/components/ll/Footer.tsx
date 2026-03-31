import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-charcoal text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          <div className="md:col-span-2">
            <span className="text-lg font-bold tracking-tight uppercase">
              Loud Legacy
            </span>
            <p className="mt-4 text-warm-gray-light text-sm leading-relaxed max-w-sm">
              Building platforms that create opportunity, connection, and
              long-term impact across business, sports, and community.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-warm-gray-light mb-4">
              Navigate
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-warm-gray-light hover:text-white transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/the-collective"
                  className="text-sm text-warm-gray-light hover:text-white transition-colors"
                >
                  The Collective
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-warm-gray-light hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-warm-gray-light mb-4">
              Connect
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/the-collective"
                  className="text-sm text-warm-gray-light hover:text-white transition-colors"
                >
                  Explore The Collective
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-warm-gray-light hover:text-white transition-colors"
                >
                  Request Access
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border-dark flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-warm-gray">
            &copy; {new Date().getFullYear()} Loud Legacy. All rights reserved.
          </p>
          <p className="text-xs text-warm-gray">
            Platforms built for those creating what&apos;s next.
          </p>
        </div>
      </div>
    </footer>
  );
}
