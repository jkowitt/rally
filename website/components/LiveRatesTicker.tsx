'use client';

import { useEffect, useState } from 'react';

interface RateData {
  conventional30: number;
  conventional15: number;
  commercial: number;
  bridge: number;
  sba504: number;
  fedFundsRate: number | null;
  prime: number | null;
  treasury10yr: number | null;
  lastUpdated: string;
  source: string;
}

export default function LiveRatesTicker() {
  const [rates, setRates] = useState<RateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/interest-rates');
        if (res.ok) {
          const data = await res.json();
          if (data.conventional30) {
            setRates(data as RateData);
          }
        }
      } catch {
        // Silent fail — ticker just won't show
      }
      setLoading(false);
    };
    fetchRates();
  }, []);

  if (loading) {
    return (
      <div className="rates-ticker">
        <div className="rates-ticker-inner">
          <span className="rates-ticker-loading">Loading live rates...</span>
        </div>
      </div>
    );
  }

  if (!rates) return null;

  const items: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: '30-Yr Fixed', value: `${rates.conventional30}%` },
    { label: '15-Yr Fixed', value: `${rates.conventional15}%` },
    { label: 'Commercial', value: `${rates.commercial}%`, highlight: true },
    { label: 'Bridge', value: `${rates.bridge}%` },
    { label: 'SBA 504', value: `${rates.sba504}%` },
  ];

  if (rates.fedFundsRate !== null) {
    items.push({ label: 'Fed Funds', value: `${rates.fedFundsRate}%` });
  }
  if (rates.prime !== null) {
    items.push({ label: 'Prime', value: `${rates.prime}%` });
  }
  if (rates.treasury10yr !== null) {
    items.push({ label: '10-Yr Treasury', value: `${rates.treasury10yr}%` });
  }

  return (
    <div className="rates-ticker">
      <div className="rates-ticker-inner">
        <div className="rates-ticker-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          Live Rates
        </div>
        <div className="rates-ticker-items">
          {items.map((item) => (
            <div key={item.label} className={`rates-ticker-item${item.highlight ? ' highlight' : ''}`}>
              <span className="rates-ticker-item-label">{item.label}</span>
              <span className="rates-ticker-item-value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="rates-ticker-meta">
          <span>{rates.source}</span>
          <span>{rates.lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}
