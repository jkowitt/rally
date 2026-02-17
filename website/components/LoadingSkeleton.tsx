"use client";

interface SkeletonProps {
  variant?: "text" | "card" | "avatar" | "stat" | "list";
  count?: number;
}

function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`rally-skeleton ${className}`} />;
}

export function LoadingSkeleton({ variant = "card", count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "text") {
    return (
      <div className="rally-skeleton-text-group">
        {items.map((i) => (
          <SkeletonPulse key={i} className="rally-skeleton--text" />
        ))}
      </div>
    );
  }

  if (variant === "avatar") {
    return (
      <div className="rally-skeleton-row">
        {items.map((i) => (
          <SkeletonPulse key={i} className="rally-skeleton--avatar" />
        ))}
      </div>
    );
  }

  if (variant === "stat") {
    return (
      <div className="rally-skeleton-stats">
        {items.map((i) => (
          <div key={i} className="rally-skeleton-stat">
            <SkeletonPulse className="rally-skeleton--stat-value" />
            <SkeletonPulse className="rally-skeleton--stat-label" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="rally-skeleton-list">
        {items.map((i) => (
          <div key={i} className="rally-skeleton-list-item">
            <SkeletonPulse className="rally-skeleton--avatar-sm" />
            <div className="rally-skeleton-list-content">
              <SkeletonPulse className="rally-skeleton--text-short" />
              <SkeletonPulse className="rally-skeleton--text-long" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: card
  return (
    <div className="rally-skeleton-cards">
      {items.map((i) => (
        <div key={i} className="rally-skeleton-card">
          <SkeletonPulse className="rally-skeleton--card-header" />
          <SkeletonPulse className="rally-skeleton--text" />
          <SkeletonPulse className="rally-skeleton--text-short" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="rally-dash-page">
      <div className="rally-skeleton-page-header">
        <SkeletonPulse className="rally-skeleton--heading" />
        <SkeletonPulse className="rally-skeleton--text-short" />
      </div>
      <LoadingSkeleton variant="stat" count={4} />
      <LoadingSkeleton variant="card" count={3} />
    </div>
  );
}
