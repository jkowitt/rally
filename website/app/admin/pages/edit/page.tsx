"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";

interface EditableElement {
  id: string;
  selector: string;
  type: "text" | "heading" | "image" | "link" | "button";
  content: string;
  styles?: Record<string, string>;
}

interface PendingChange {
  elementId: string;
  originalContent: string;
  newContent: string;
  selector: string;
}

function PageEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pagePath = searchParams.get("path") || "/";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedElement, setSelectedElement] = useState<EditableElement | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Element editing state
  const [editingContent, setEditingContent] = useState("");
  const [editingStyles, setEditingStyles] = useState<Record<string, string>>({});

  const deviceWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Inject editing styles
      const style = doc.createElement("style");
      style.textContent = `
        .admin-editable {
          outline: 2px dashed transparent !important;
          transition: outline-color 0.2s, background-color 0.2s !important;
          cursor: pointer !important;
        }
        .admin-editable:hover {
          outline-color: #3B82F6 !important;
          background-color: rgba(59, 130, 246, 0.05) !important;
        }
        .admin-editable.selected {
          outline: 2px solid #3B82F6 !important;
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        .admin-editable.changed {
          outline-color: #F59E0B !important;
        }
        .admin-edit-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #1E293B;
          color: white;
          padding: 8px 16px;
          font-size: 14px;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `;
      doc.head.appendChild(style);

      // Make elements editable
      if (isEditing) {
        const editableSelectors = "h1, h2, h3, h4, h5, h6, p, span, a, button, img";
        const elements = doc.querySelectorAll(editableSelectors);

        elements.forEach((el, index) => {
          el.classList.add("admin-editable");
          el.setAttribute("data-edit-id", `elem-${index}`);

          el.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove previous selection
            doc.querySelectorAll(".admin-editable.selected").forEach((sel) => {
              sel.classList.remove("selected");
            });

            el.classList.add("selected");

            const tagName = el.tagName.toLowerCase();
            const type = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)
              ? "heading"
              : tagName === "img"
                ? "image"
                : tagName === "a"
                  ? "link"
                  : tagName === "button"
                    ? "button"
                    : "text";

            const content = type === "image" ? (el as HTMLImageElement).src : el.textContent || "";

            setSelectedElement({
              id: `elem-${index}`,
              selector: `[data-edit-id="elem-${index}"]`,
              type,
              content,
            });
            setEditingContent(content);

            // Get computed styles
            const computed = iframe.contentWindow?.getComputedStyle(el);
            if (computed) {
              setEditingStyles({
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                color: computed.color,
                textAlign: computed.textAlign as string,
              });
            }
          });
        });
      }
    } catch (error) {
      console.error("Error initializing iframe editing:", error);
    }
  };

  const applyChange = () => {
    if (!selectedElement || !iframeRef.current?.contentDocument) return;

    const doc = iframeRef.current.contentDocument;
    const element = doc.querySelector(selectedElement.selector);

    if (element) {
      const originalContent = selectedElement.content;

      if (selectedElement.type === "image") {
        (element as HTMLImageElement).src = editingContent;
      } else {
        element.textContent = editingContent;
      }

      element.classList.add("changed");

      // Track pending change
      const existingIndex = pendingChanges.findIndex((c) => c.elementId === selectedElement.id);
      if (existingIndex >= 0) {
        const updated = [...pendingChanges];
        updated[existingIndex].newContent = editingContent;
        setPendingChanges(updated);
      } else {
        setPendingChanges([
          ...pendingChanges,
          {
            elementId: selectedElement.id,
            originalContent,
            newContent: editingContent,
            selector: selectedElement.selector,
          },
        ]);
      }

      setToast({ message: "Change applied. Save to publish.", type: "success" });
    }
  };

  const revertChange = (change: PendingChange) => {
    if (!iframeRef.current?.contentDocument) return;

    const doc = iframeRef.current.contentDocument;
    const element = doc.querySelector(change.selector);

    if (element) {
      element.textContent = change.originalContent;
      element.classList.remove("changed");
    }

    setPendingChanges(pendingChanges.filter((c) => c.elementId !== change.elementId));
    setToast({ message: "Change reverted", type: "success" });
  };

  const saveChanges = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pagePath,
          changes: pendingChanges,
          status: "draft",
        }),
      });

      if (response.ok) {
        setToast({ message: "Changes saved as draft!", type: "success" });
        setPendingChanges([]);
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      setToast({ message: "Failed to save changes", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const publishChanges = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pagePath,
          changes: pendingChanges,
          status: "published",
        }),
      });

      if (response.ok) {
        setToast({ message: "Changes published!", type: "success" });
        setPendingChanges([]);
        // Reload iframe to show published version
        if (iframeRef.current) {
          iframeRef.current.src = `${pagePath}?t=${Date.now()}`;
        }
      } else {
        throw new Error("Failed to publish");
      }
    } catch (error) {
      setToast({ message: "Failed to publish changes", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Editor Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/admin/pages"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--admin-text-secondary)",
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Back
          </Link>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Editing: {pagePath}</h2>
          {pendingChanges.length > 0 && (
            <span className="admin-badge admin-badge-warning">{pendingChanges.length} unsaved changes</span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {/* Device Preview Buttons */}
          <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--admin-border)" }}>
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <button
                key={device}
                onClick={() => setPreviewDevice(device)}
                style={{
                  padding: "0.5rem 0.75rem",
                  background: previewDevice === device ? "var(--admin-accent)" : "white",
                  color: previewDevice === device ? "white" : "var(--admin-text)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {device === "desktop" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                )}
                {device === "tablet" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                )}
                {device === "mobile" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`admin-btn ${isEditing ? "admin-btn-success" : "admin-btn-secondary"}`}
          >
            <span className="admin-btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
            {isEditing ? "Editing Mode" : "Enable Editing"}
          </button>

          <Link
            href={`${pagePath}?preview=true`}
            target="_blank"
            className="admin-btn admin-btn-secondary"
          >
            <span className="admin-btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </span>
            Preview
          </Link>

          <button
            onClick={saveChanges}
            disabled={pendingChanges.length === 0 || isSaving}
            className="admin-btn admin-btn-secondary"
          >
            Save Draft
          </button>

          <button
            onClick={publishChanges}
            disabled={pendingChanges.length === 0 || isSaving}
            className="admin-btn admin-btn-primary"
          >
            {isSaving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="admin-editor-container">
        {/* Preview Frame */}
        <div className="admin-editor-main">
          <div className="admin-editor-preview" style={{ display: "flex", justifyContent: "center", background: "#E2E8F0" }}>
            <div
              style={{
                width: deviceWidths[previewDevice],
                maxWidth: "100%",
                height: "100%",
                background: "white",
                boxShadow: previewDevice !== "desktop" ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
                transition: "width 0.3s ease",
              }}
            >
              <iframe
                ref={iframeRef}
                src={`${pagePath}?admin_edit=true`}
                className="admin-editor-iframe"
                onLoad={handleIframeLoad}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="admin-editor-sidebar">
          {/* Element Properties */}
          {selectedElement && (
            <div className="admin-editor-panel">
              <div className="admin-editor-panel-header">Edit Element</div>
              <div className="admin-editor-panel-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Type</label>
                  <div className="admin-badge admin-badge-info">{selectedElement.type}</div>
                </div>

                {selectedElement.type === "image" ? (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Image URL</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ marginTop: "0.5rem", width: "100%" }}
                      onClick={() => router.push("/admin/media?select=true")}
                    >
                      Browse Media Library
                    </button>
                  </div>
                ) : (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Content</label>
                    <textarea
                      className="admin-form-textarea"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                {/* Style Controls */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Text Align</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {["left", "center", "right"].map((align) => (
                      <button
                        key={align}
                        onClick={() => setEditingStyles({ ...editingStyles, textAlign: align })}
                        className={`admin-editor-tool ${editingStyles.textAlign === align ? "active" : ""}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {align === "left" && (
                            <>
                              <line x1="17" y1="10" x2="3" y2="10" />
                              <line x1="21" y1="6" x2="3" y2="6" />
                              <line x1="21" y1="14" x2="3" y2="14" />
                              <line x1="17" y1="18" x2="3" y2="18" />
                            </>
                          )}
                          {align === "center" && (
                            <>
                              <line x1="18" y1="10" x2="6" y2="10" />
                              <line x1="21" y1="6" x2="3" y2="6" />
                              <line x1="21" y1="14" x2="3" y2="14" />
                              <line x1="18" y1="18" x2="6" y2="18" />
                            </>
                          )}
                          {align === "right" && (
                            <>
                              <line x1="21" y1="10" x2="7" y2="10" />
                              <line x1="21" y1="6" x2="3" y2="6" />
                              <line x1="21" y1="14" x2="3" y2="14" />
                              <line x1="21" y1="18" x2="7" y2="18" />
                            </>
                          )}
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={applyChange} className="admin-btn admin-btn-primary" style={{ width: "100%" }}>
                  Apply Change
                </button>
              </div>
            </div>
          )}

          {/* Pending Changes */}
          {pendingChanges.length > 0 && (
            <div className="admin-editor-panel">
              <div className="admin-editor-panel-header">Pending Changes ({pendingChanges.length})</div>
              <div className="admin-editor-panel-body">
                {pendingChanges.map((change) => (
                  <div
                    key={change.elementId}
                    style={{
                      padding: "0.75rem",
                      background: "var(--admin-bg)",
                      borderRadius: "8px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div style={{ fontSize: "0.8125rem", color: "var(--admin-text-secondary)", marginBottom: "0.25rem" }}>
                      {change.elementId}
                    </div>
                    <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      <span style={{ textDecoration: "line-through", color: "var(--admin-danger)" }}>
                        {change.originalContent.substring(0, 30)}...
                      </span>
                      <br />
                      <span style={{ color: "var(--admin-success)" }}>
                        {change.newContent.substring(0, 30)}...
                      </span>
                    </div>
                    <button
                      onClick={() => revertChange(change)}
                      className="admin-btn admin-btn-danger"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                    >
                      Revert
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Elements */}
          <div className="admin-editor-panel">
            <div className="admin-editor-panel-header">Add Elements</div>
            <div className="admin-editor-panel-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                {[
                  { label: "Text", icon: "T" },
                  { label: "Heading", icon: "H" },
                  { label: "Image", icon: "🖼" },
                  { label: "Video", icon: "▶" },
                  { label: "Button", icon: "⬜" },
                  { label: "Banner", icon: "📢" },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="admin-btn admin-btn-secondary"
                    style={{ flexDirection: "column", padding: "1rem", gap: "0.25rem" }}
                  >
                    <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                    <span style={{ fontSize: "0.75rem" }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default function PageEditor() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <PageEditorContent />
    </Suspense>
  );
}
