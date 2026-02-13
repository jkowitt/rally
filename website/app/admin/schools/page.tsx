"use client";

import { useState, useEffect } from "react";
import { rallyContent } from "@/lib/rally-api";
import type { School } from "@/lib/rally-api";

const conferences = [
  "All", "Independent", "ACC", "Big Ten", "Big 12", "SEC", "Pac-12", "Big East",
  "AAC", "Mountain West", "Sun Belt", "Conference USA", "MAC",
];

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    rallyContent.getSchools().then((res) => {
      if (res.ok && res.data?.schools) {
        setSchools(res.data.schools);
      }
      setLoading(false);
    });
  }, []);

  const filtered = filter === "All" ? schools : schools.filter(s => s.conference === filter);

  return (
    <div className="rally-admin-page">
      <div className="rally-admin-section">
        <div className="rally-admin-section-header">
          <h3>Schools ({filtered.length})</h3>
          <div className="rally-admin-filters">
            {conferences.map((conf) => (
              <button
                key={conf}
                className={`rally-admin-filter-btn ${filter === conf ? 'active' : ''}`}
                onClick={() => setFilter(conf)}
              >
                {conf}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rally-admin-loading">Loading schools...</div>
        ) : schools.length === 0 ? (
          <p className="rally-admin-empty">No schools loaded. Make sure the Rally server is running.</p>
        ) : (
          <div className="rally-admin-schools-grid">
            {filtered.map((school) => (
              <div key={school.id} className="rally-admin-school-card">
                <div className="rally-admin-school-color" style={{ backgroundColor: school.primaryColor }} />
                <div className="rally-admin-school-info">
                  <span className="rally-admin-school-name">{school.name}</span>
                  <span className="rally-admin-school-mascot">{school.mascot}</span>
                  <span className="rally-admin-school-conf">{school.conference}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
