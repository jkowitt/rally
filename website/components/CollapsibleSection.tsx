"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        className={`collapsible-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="collapsible-title">
          {icon && <span className="collapsible-icon">{icon}</span>}
          <h3>{title}</h3>
        </div>
        <span className="collapsible-toggle">{isOpen ? '−' : '+'}</span>
      </button>
      <div className={`collapsible-content ${isOpen ? 'open' : ''}`}>
        <div className="collapsible-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
