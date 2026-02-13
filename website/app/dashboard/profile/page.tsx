"use client";

import { useState } from "react";
import { useRallyAuth } from "@/lib/rally-auth";

const AVAILABLE_SCHOOL = { id: "rally-university", name: "Rally University", mascot: "Ralliers", primaryColor: "#FF6B35" };

export default function ProfilePage() {
  const { user, updateProfile } = useRallyAuth();
  const [isChangingSchool, setIsChangingSchool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChangeSchool = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({ favoriteSchool: AVAILABLE_SCHOOL.id });
    if (result.success) {
      setMessage("School updated to Rally University!");
      setIsChangingSchool(false);
    } else {
      setMessage(result.error || "Failed to update school");
    }
    setSaving(false);
  };

  const schoolDisplay = user?.favoriteSchool === "rally-university"
    ? "Rally University"
    : user?.favoriteSchool || "Not selected";

  return (
    <div className="rally-dash-page">
      <div className="rally-dash-welcome">
        <h1>Profile</h1>
        <p className="rally-dash-subtitle">Your Rally account details</p>
      </div>

      {/* Profile Card */}
      <div className="rally-dash-profile-card">
        <div className="rally-dash-profile-avatar">
          {user?.name?.substring(0, 2).toUpperCase()}
        </div>
        <div className="rally-dash-profile-info">
          <h2>{user?.name}</h2>
          <p className="rally-dash-profile-handle">{user?.handle || "@fan"}</p>
          <span className="rally-dash-profile-role">{user?.role}</span>
        </div>
      </div>

      {/* School Affiliation */}
      <div className="rally-dash-section">
        <h3>School Affiliation</h3>
        {message && (
          <div style={{ padding: '8px 12px', marginBottom: '12px', borderRadius: '8px', fontSize: '13px', background: message.includes("Failed") ? 'rgba(239,68,68,0.15)' : 'rgba(52,199,89,0.15)', color: message.includes("Failed") ? '#ef4444' : '#34C759' }}>
            {message}
          </div>
        )}
        <div className="rally-dash-detail-grid">
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Favorite School</span>
            <span className="rally-dash-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user?.favoriteSchool === "rally-university" && (
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: AVAILABLE_SCHOOL.primaryColor }} />
              )}
              {schoolDisplay}
            </span>
          </div>
        </div>

        {!isChangingSchool ? (
          <button
            className="rally-btn rally-btn--primary"
            style={{ marginTop: '12px', width: '100%' }}
            onClick={() => setIsChangingSchool(true)}
          >
            Change School
          </button>
        ) : (
          <div style={{ marginTop: '12px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,107,53,0.3)', background: 'rgba(255,107,53,0.05)' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
              Select your school affiliation:
            </p>
            <button
              onClick={handleChangeSchool}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                padding: '12px 16px', borderRadius: '10px', border: '2px solid #FF6B35',
                background: 'rgba(255,107,53,0.1)', cursor: 'pointer', color: '#fff',
              }}
            >
              <span style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>RU</span>
              <span style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: '15px' }}>Rally University</span>
                <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Ralliers &middot; Independent</span>
              </span>
              {saving && <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Saving...</span>}
            </button>
            <button
              onClick={() => { setIsChangingSchool(false); setMessage(null); }}
              style={{ marginTop: '8px', width: '100%', padding: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Account Details */}
      <div className="rally-dash-section">
        <h3>Account Details</h3>
        <div className="rally-dash-detail-grid">
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Email</span>
            <span className="rally-dash-detail-value">{user?.email}</span>
          </div>
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Email Verified</span>
            <span className={`rally-dash-detail-value ${user?.emailVerified ? 'verified' : 'unverified'}`}>
              {user?.emailVerified ? "Verified" : "Not verified"}
            </span>
          </div>
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Points</span>
            <span className="rally-dash-detail-value">{(user?.points || 0).toLocaleString()}</span>
          </div>
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Tier</span>
            <span className="rally-dash-detail-value">{user?.tier || "Bronze"}</span>
          </div>
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Member Since</span>
            <span className="rally-dash-detail-value">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="rally-dash-section">
        <h3>Preferences</h3>
        <div className="rally-dash-detail-grid">
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Email Updates</span>
            <span className="rally-dash-detail-value">{user?.emailUpdates ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Push Notifications</span>
            <span className="rally-dash-detail-value">{user?.pushNotifications ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Terms Accepted</span>
            <span className="rally-dash-detail-value">{user?.acceptedTerms ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
