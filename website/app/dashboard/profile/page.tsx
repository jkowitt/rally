"use client";

import { useState } from "react";
import { useRallyAuth } from "@/lib/rally-auth";
import { rallyAuth, type HandleModerationResult } from "@/lib/rally-api";

const AVAILABLE_SCHOOL = { id: "rally-university", name: "Rally University", mascot: "Ralliers", primaryColor: "#FF6B35" };

const USER_TYPE_LABELS: Record<string, string> = {
  student: "Current Student",
  alumni: "Alumni",
  general_fan: "General Fan",
};

export default function ProfilePage() {
  const { user, updateProfile } = useRallyAuth();
  const [isChangingSchool, setIsChangingSchool] = useState(false);
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newHandle, setNewHandle] = useState("");
  const [handleMessage, setHandleMessage] = useState<string | null>(null);
  const [handleForced, setHandleForced] = useState<HandleModerationResult | null>(null);
  const [demoForm, setDemoForm] = useState({
    userType: user?.userType || "",
    birthYear: user?.birthYear?.toString() || "",
    residingCity: user?.residingCity || "",
    residingState: user?.residingState || "",
  });

  const handleLocked = user?.handleLockedUntil && new Date(user.handleLockedUntil) > new Date();

  const handleSaveHandle = async () => {
    if (!newHandle.trim()) return;
    setSaving(true);
    setHandleMessage(null);
    setHandleForced(null);

    const handle = newHandle.startsWith("@") ? newHandle : `@${newHandle}`;
    const result = await updateProfile({ handle });

    if (result.success) {
      setHandleMessage("Handle updated successfully!");
      setIsEditingHandle(false);
      setNewHandle("");
    } else {
      setHandleMessage(result.error || "Failed to update handle");
    }
    setSaving(false);
  };

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

      {/* Handle Management */}
      <div className="rally-dash-section">
        <h3>Handle</h3>
        {handleMessage && (
          <div style={{
            padding: '8px 12px', marginBottom: '12px', borderRadius: '8px', fontSize: '13px',
            background: handleMessage.includes("success") ? 'rgba(52,199,89,0.15)' : 'rgba(239,68,68,0.15)',
            color: handleMessage.includes("success") ? '#34C759' : '#ef4444',
          }}>
            {handleMessage}
          </div>
        )}

        {user?.handleAutoAssigned && (
          <div style={{
            padding: '10px 14px', marginBottom: '12px', borderRadius: '10px',
            background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.25)',
            fontSize: '13px', color: '#ffaa33', lineHeight: 1.5,
          }}>
            Your handle was auto-assigned due to content policy violations.
            {handleLocked ? (
              <> You can change it after <strong>{new Date(user.handleLockedUntil!).toLocaleDateString()}</strong> at <strong>{new Date(user.handleLockedUntil!).toLocaleTimeString()}</strong>.</>
            ) : (
              <> The cooldown period has ended. You can now change your handle.</>
            )}
          </div>
        )}

        {user?.handleWarnings !== undefined && user.handleWarnings > 0 && (
          <div style={{
            padding: '8px 12px', marginBottom: '12px', borderRadius: '8px', fontSize: '12px',
            background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)',
          }}>
            Content policy warnings: {user.handleWarnings}/3
          </div>
        )}

        <div className="rally-dash-detail-grid">
          <div className="rally-dash-detail-row">
            <span className="rally-dash-detail-label">Current Handle</span>
            <span className="rally-dash-detail-value" style={{ fontWeight: 600 }}>{user?.handle || "@fan"}</span>
          </div>
        </div>

        {!isEditingHandle ? (
          <button
            className="rally-btn rally-btn--primary"
            style={{ marginTop: '12px', width: '100%' }}
            onClick={() => {
              setIsEditingHandle(true);
              setNewHandle(user?.handle?.replace(/^@/, '') || '');
              setHandleMessage(null);
              setHandleForced(null);
            }}
            disabled={!!handleLocked}
          >
            {handleLocked ? `Locked until ${new Date(user!.handleLockedUntil!).toLocaleDateString()}` : 'Change Handle'}
          </button>
        ) : (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <span style={{
                padding: '10px 12px', borderRadius: '8px 0 0 8px',
                background: 'rgba(255,107,53,0.15)', color: '#FF6B35',
                fontWeight: 600, fontSize: '14px',
                border: '1px solid rgba(255,255,255,0.1)', borderRight: 'none',
              }}>@</span>
              <input
                type="text"
                value={newHandle.replace(/^@/, '')}
                onChange={(e) => setNewHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="newhandle"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '0 8px 8px 0',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="rally-btn rally-btn--secondary"
                style={{ flex: 1 }}
                onClick={() => { setIsEditingHandle(false); setHandleMessage(null); setHandleForced(null); }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="rally-btn rally-btn--primary"
                style={{ flex: 1 }}
                onClick={handleSaveHandle}
                disabled={saving || !newHandle.trim()}
              >
                {saving ? "Saving..." : "Save Handle"}
              </button>
            </div>
          </div>
        )}
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

      {/* Demographics */}
      <div className="rally-dash-section">
        <h3>About You</h3>
        {!isEditingDemographics ? (
          <>
            <div className="rally-dash-detail-grid">
              <div className="rally-dash-detail-row">
                <span className="rally-dash-detail-label">Type</span>
                <span className="rally-dash-detail-value">{user?.userType ? USER_TYPE_LABELS[user.userType] || user.userType : "Not set"}</span>
              </div>
              <div className="rally-dash-detail-row">
                <span className="rally-dash-detail-label">Birth Year</span>
                <span className="rally-dash-detail-value">{user?.birthYear || "Not set"}</span>
              </div>
              <div className="rally-dash-detail-row">
                <span className="rally-dash-detail-label">City</span>
                <span className="rally-dash-detail-value">{user?.residingCity || "Not set"}</span>
              </div>
              <div className="rally-dash-detail-row">
                <span className="rally-dash-detail-label">State</span>
                <span className="rally-dash-detail-value">{user?.residingState || "Not set"}</span>
              </div>
            </div>
            <button
              className="rally-btn rally-btn--primary"
              style={{ marginTop: '12px', width: '100%' }}
              onClick={() => {
                setDemoForm({
                  userType: user?.userType || "",
                  birthYear: user?.birthYear?.toString() || "",
                  residingCity: user?.residingCity || "",
                  residingState: user?.residingState || "",
                });
                setIsEditingDemographics(true);
              }}
            >
              Edit Demographics
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>I am a...</label>
              <select
                value={demoForm.userType}
                onChange={(e) => setDemoForm({ ...demoForm, userType: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}
              >
                <option value="">Not specified</option>
                <option value="student">Current Student</option>
                <option value="alumni">Alumni</option>
                <option value="general_fan">General Fan</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Birth Year</label>
              <input
                type="number"
                value={demoForm.birthYear}
                onChange={(e) => setDemoForm({ ...demoForm, birthYear: e.target.value })}
                placeholder="e.g. 2002"
                min="1900"
                max={new Date().getFullYear()}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>City</label>
              <input
                type="text"
                value={demoForm.residingCity}
                onChange={(e) => setDemoForm({ ...demoForm, residingCity: e.target.value })}
                placeholder="Your city"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>State</label>
              <input
                type="text"
                value={demoForm.residingState}
                onChange={(e) => setDemoForm({ ...demoForm, residingState: e.target.value })}
                placeholder="Your state"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                className="rally-btn rally-btn--secondary"
                style={{ flex: 1 }}
                onClick={() => { setIsEditingDemographics(false); setMessage(null); }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="rally-btn rally-btn--primary"
                style={{ flex: 1 }}
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setMessage(null);
                  const birthYearNum = demoForm.birthYear ? parseInt(demoForm.birthYear, 10) : undefined;
                  const result = await updateProfile({
                    userType: (demoForm.userType as 'student' | 'alumni' | 'general_fan') || null,
                    birthYear: birthYearNum && !isNaN(birthYearNum) ? birthYearNum : null,
                    residingCity: demoForm.residingCity.trim() || null,
                    residingState: demoForm.residingState.trim() || null,
                  });
                  if (result.success) {
                    setMessage("Demographics updated!");
                    setIsEditingDemographics(false);
                  } else {
                    setMessage(result.error || "Failed to update demographics");
                  }
                  setSaving(false);
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
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
