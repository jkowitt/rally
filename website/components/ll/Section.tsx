"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  dark?: boolean;
}

export function Section({ children, className = "", id, dark }: SectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id={id}
      ref={ref}
      className={`section-padding ${dark ? "bg-charcoal text-white" : ""} ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="mx-auto max-w-7xl px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </section>
  );
}

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  center?: boolean;
  dark?: boolean;
}

export function SectionHeader({
  label,
  title,
  description,
  center = true,
  dark,
}: SectionHeaderProps) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""} mb-16`}>
      {label && (
        <p
          className={`text-xs font-semibold uppercase tracking-widest mb-4 ${
            dark ? "text-accent-light" : "text-accent"
          }`}
        >
          {label}
        </p>
      )}
      <h2
        className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight ${
          dark ? "text-white" : "text-charcoal"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-5 text-base md:text-lg leading-relaxed ${
            dark ? "text-warm-gray-light" : "text-warm-gray"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
