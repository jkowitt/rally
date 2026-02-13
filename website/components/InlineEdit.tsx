"use client";

import { useState, useEffect } from 'react';

interface InlineEditProps {
  contentKey: string;
  defaultValue: string;
  section?: string;
  type?: 'TEXT' | 'HTML' | 'MARKDOWN';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
  userRole?: string; // Pass from session
}

/**
 * InlineEdit Component
 *
 * Allows SUPER_ADMIN users to edit site content directly inline.
 * For non-admin users, it simply displays the content.
 *
 * Usage:
 * <InlineEdit
 *   contentKey="homepage_hero_title"
 *   defaultValue="Welcome to Legacy RE"
 *   section="homepage"
 *   as="h1"
 *   userRole={session?.user?.role}
 * />
 */
export default function InlineEdit({
  contentKey,
  defaultValue,
  section = 'general',
  type = 'TEXT',
  as: Component = 'div',
  className = '',
  style = {},
  userRole,
}: InlineEditProps) {
  const [value, setValue] = useState(defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Fetch current value from API on mount
  useEffect(() => {
    fetchContent();
  }, [contentKey]);

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/cms?section=${section}`);
      const data = await response.json();

      if (data.success) {
        const content = data.content.find((item: any) => item.key === contentKey);
        if (content) {
          setValue(content.value);
        }
      }
    } catch (err) {
      console.error('Failed to fetch content:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: contentKey,
          value,
          type,
          section,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(data.error || 'Failed to save content');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    fetchContent(); // Revert to saved value
    setIsEditing(false);
    setError(null);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Component className={className} style={style}>
        {value}
      </Component>

      {isSuperAdmin && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          zIndex: 100,
        }}>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              title={`Edit ${contentKey}`}
              style={{
                background: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3182ce';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4299e1';
              }}
            >
              ✏️ Edit
            </button>
          )}

          {success && (
            <div style={{
              background: '#48bb78',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              ✓ Saved
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>
              Edit Content
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#4a5568',
              }}>
                Content Key
              </label>
              <input
                type="text"
                value={contentKey}
                disabled
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  background: '#f7fafc',
                  color: '#718096',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#4a5568',
              }}>
                Content
              </label>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={type === 'TEXT' ? 3 : 8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #cbd5e0',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: type === 'TEXT' ? 'inherit' : 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                background: '#fed7d7',
                color: '#c53030',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}>
                {error}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #cbd5e0',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  background: isSaving ? '#cbd5e0' : '#4299e1',
                  color: 'white',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#edf2f7',
              borderRadius: '4px',
              fontSize: '0.75rem',
              color: '#718096',
            }}>
              <strong>Section:</strong> {section} • <strong>Type:</strong> {type}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
