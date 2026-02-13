"use client";

import Link from "next/link";
import Image from "next/image";

type ProductType = "valora" | "sportify" | "business-now" | "legacy-crm" | "loud-legacy";

interface ProductLogoProps {
  product: ProductType;
  size?: "small" | "medium" | "large";
  linkTo?: string;
  className?: string;
}

const logoConfig: Record<ProductType, { src: string; alt: string; defaultLink: string }> = {
  valora: {
    src: "/logos/legacy-re.svg",
    alt: "Legacy RE - Real Estate Intelligence",
    defaultLink: "/valora",
  },
  sportify: {
    src: "/logos/sportify.svg",
    alt: "Sportify - Event Management",
    defaultLink: "/sportify",
  },
  "business-now": {
    src: "/logos/business-now.svg",
    alt: "Business Now - Operations",
    defaultLink: "/business-now",
  },
  "legacy-crm": {
    src: "/logos/legacy-crm.svg",
    alt: "Legacy CRM - Relationship Management",
    defaultLink: "/legacy-crm",
  },
  "loud-legacy": {
    src: "/logos/loud-legacy.svg",
    alt: "Loud Legacy",
    defaultLink: "/",
  },
};

const sizeConfig = {
  small: { width: 100, height: 35 },
  medium: { width: 160, height: 55 },
  large: { width: 220, height: 75 },
};

export function ProductLogo({ product, size = "medium", linkTo, className = "" }: ProductLogoProps) {
  const config = logoConfig[product];
  const dimensions = sizeConfig[size];
  const href = linkTo ?? config.defaultLink;

  return (
    <Link
      href={href}
      className={`product-logo product-logo--${size} ${className}`}
      aria-label={`Go to ${config.alt}`}
    >
      <Image
        src={config.src}
        alt={config.alt}
        width={dimensions.width}
        height={dimensions.height}
        className="product-logo-image"
        priority
      />
    </Link>
  );
}

export default ProductLogo;
