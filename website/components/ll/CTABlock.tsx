import Link from "next/link";

interface CTABlockProps {
  headline: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  dark?: boolean;
}

export function CTABlock({
  headline,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  dark,
}: CTABlockProps) {
  return (
    <div className="text-center">
      <h2
        className={`text-2xl md:text-3xl font-bold tracking-tight mb-8 ${
          dark ? "text-white" : "text-charcoal"
        }`}
      >
        {headline}
      </h2>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href={primaryHref}
          className={`inline-flex items-center px-7 py-3.5 text-sm font-semibold rounded-sm transition-colors ${
            dark
              ? "bg-white text-charcoal hover:bg-stone-100"
              : "bg-charcoal text-white hover:bg-charcoal-light"
          }`}
        >
          {primaryLabel}
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className={`inline-flex items-center px-7 py-3.5 text-sm font-semibold rounded-sm border transition-colors ${
              dark
                ? "border-white/20 text-white hover:bg-white/5"
                : "border-stone-300 text-charcoal hover:bg-stone-50"
            }`}
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
