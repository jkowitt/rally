interface Feature {
  title: string;
  description: string;
}

interface FeatureGridProps {
  features: Feature[];
  columns?: 2 | 3;
  dark?: boolean;
}

export function FeatureGrid({
  features,
  columns = 3,
  dark,
}: FeatureGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-8 ${
        columns === 3
          ? "md:grid-cols-3"
          : "md:grid-cols-2"
      }`}
    >
      {features.map((feature) => (
        <div key={feature.title} className="group">
          <div
            className={`h-px w-8 mb-6 transition-all duration-300 group-hover:w-12 ${
              dark ? "bg-accent-light" : "bg-accent"
            }`}
          />
          <h3
            className={`text-base font-semibold mb-3 ${
              dark ? "text-white" : "text-charcoal"
            }`}
          >
            {feature.title}
          </h3>
          <p
            className={`text-sm leading-relaxed ${
              dark ? "text-warm-gray-light" : "text-warm-gray"
            }`}
          >
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
