"use client";

import { useState, useRef, useCallback } from "react";

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  tags: string[];
  uploadedAt: string;
}

// Demo media items
const demoMedia: MediaItem[] = [
  {
    id: "media-1",
    name: "hero-background.jpg",
    type: "image",
    url: "/images/hero-bg.jpg",
    thumbnailUrl: "/images/hero-bg.jpg",
    size: 245000,
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080,
    tags: ["hero", "background"],
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-2",
    name: "business-now-banner.png",
    type: "image",
    url: "/banners/business-now.png",
    thumbnailUrl: "/banners/business-now.png",
    size: 156000,
    mimeType: "image/png",
    width: 728,
    height: 90,
    tags: ["banner", "business-now"],
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-3",
    name: "intro-video.mp4",
    type: "video",
    url: "/videos/intro.mp4",
    thumbnailUrl: "/videos/intro-thumb.jpg",
    size: 15000000,
    mimeType: "video/mp4",
    width: 1920,
    height: 1080,
    duration: 120,
    tags: ["intro", "marketing"],
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-4",
    name: "legacy-crm-screenshot.png",
    type: "image",
    url: "/images/legacy-crm-screen.png",
    thumbnailUrl: "/images/legacy-crm-screen.png",
    size: 320000,
    mimeType: "image/png",
    width: 1440,
    height: 900,
    tags: ["screenshot", "legacy-crm"],
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "media-5",
    name: "team-photo.jpg",
    type: "image",
    url: "/images/team.jpg",
    thumbnailUrl: "/images/team.jpg",
    size: 180000,
    mimeType: "image/jpeg",
    width: 1200,
    height: 800,
    tags: ["team", "about"],
    uploadedAt: new Date().toISOString(),
  },
];

export default function MediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(demoMedia);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedia = mediaItems.filter((item) => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 100) {
            clearInterval(progressInterval);
            return null;
          }
          return prev + 10;
        });
      }, 200);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Determine file type
      let type: MediaItem["type"] = "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";

      // Create new media item (in production, this would upload to server)
      const newItem: MediaItem = {
        id: `media-${Date.now()}`,
        name: file.name,
        type,
        url: previewUrl,
        thumbnailUrl: type === "image" ? previewUrl : undefined,
        size: file.size,
        mimeType: file.type,
        tags: [],
        uploadedAt: new Date().toISOString(),
      };

      // Add to media items after "upload"
      setTimeout(() => {
        setMediaItems((prev) => [newItem, ...prev]);
        setUploadProgress(null);
        setToast({ message: `${file.name} uploaded successfully`, type: "success" });
      }, 2000);
    }

    setShowUploadModal(false);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    setMediaItems((prev) => prev.filter((item) => !selectedItems.includes(item.id)));
    setToast({ message: `${selectedItems.length} items deleted`, type: "success" });
    setSelectedItems([]);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setToast({ message: "URL copied to clipboard", type: "success" });
  };

  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-form-input"
              style={{ width: "280px", paddingLeft: "2.5rem" }}
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "18px",
                height: "18px",
                color: "var(--admin-text-secondary)",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="admin-form-select"
            style={{ width: "140px" }}
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>

          <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--admin-border)" }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "0.5rem 0.75rem",
                background: viewMode === "grid" ? "var(--admin-accent)" : "white",
                color: viewMode === "grid" ? "white" : "var(--admin-text)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "0.5rem 0.75rem",
                background: viewMode === "list" ? "var(--admin-accent)" : "white",
                color: viewMode === "list" ? "white" : "var(--admin-text)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {selectedItems.length > 0 && (
            <button onClick={deleteSelected} className="admin-btn admin-btn-danger">
              <span className="admin-btn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </span>
              Delete ({selectedItems.length})
            </button>
          )}

          <button onClick={() => setShowUploadModal(true)} className="admin-btn admin-btn-primary">
            <span className="admin-btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            Upload Media
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {viewMode === "grid" ? (
        <div className="admin-media-grid">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className={`admin-media-item ${selectedItems.includes(item.id) ? "selected" : ""}`}
              onClick={() => setSelectedMedia(item)}
            >
              <div
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  left: "0.5rem",
                  zIndex: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelectItem(item.id);
                  }}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </div>
              <div className="admin-media-preview">
                {item.type === "image" && item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.name} />
                ) : item.type === "video" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                )}
              </div>
              <div className="admin-media-info">
                <div className="admin-media-name">{item.name}</div>
                <div className="admin-media-meta">
                  {formatFileSize(item.size)} • {item.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(filteredMedia.map((m) => m.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </th>
                <th>Preview</th>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                    />
                  </td>
                  <td>
                    <div
                      style={{
                        width: "60px",
                        height: "40px",
                        background: "var(--admin-bg)",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {item.type === "image" && item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color: "var(--admin-text-secondary)" }}>
                          {item.type === "video" ? <polygon points="5,3 19,12 5,21" /> : <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />}
                        </svg>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${item.type === "image" ? "success" : item.type === "video" ? "info" : "warning"}`}>
                      {item.type}
                    </span>
                  </td>
                  <td>{formatFileSize(item.size)}</td>
                  <td style={{ color: "var(--admin-text-secondary)" }}>
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => copyUrl(item.url)}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.25rem 0.5rem" }}
                      >
                        Copy URL
                      </button>
                      <button
                        onClick={() => setSelectedMedia(item)}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.25rem 0.5rem" }}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="admin-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Upload Media</h3>
              <button className="admin-modal-close" onClick={() => setShowUploadModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="admin-modal-body">
              <div
                className={`admin-upload-zone ${isDragging ? "dragover" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <div className="admin-upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="admin-upload-text">
                  Drag and drop files here, or click to browse
                </div>
                <div className="admin-upload-hint">
                  Supports images, videos, and documents up to 50MB
                </div>
              </div>

              {uploadProgress !== null && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ background: "var(--admin-border)", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: "100%",
                        background: "var(--admin-accent)",
                        transition: "width 0.2s",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Detail Modal */}
      {selectedMedia && (
        <div className="admin-modal-overlay" onClick={() => setSelectedMedia(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{selectedMedia.name}</h3>
              <button className="admin-modal-close" onClick={() => setSelectedMedia(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="admin-modal-body">
              <div style={{ background: "var(--admin-bg)", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
                {selectedMedia.type === "image" ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.name}
                    style={{ maxWidth: "100%", maxHeight: "300px", display: "block", margin: "0 auto" }}
                  />
                ) : selectedMedia.type === "video" ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    style={{ maxWidth: "100%", maxHeight: "300px", display: "block", margin: "0 auto" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48" style={{ color: "var(--admin-text-secondary)" }}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Type</label>
                  <input type="text" className="admin-form-input" value={selectedMedia.type} readOnly />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Size</label>
                  <input type="text" className="admin-form-input" value={formatFileSize(selectedMedia.size)} readOnly />
                </div>
              </div>

              {selectedMedia.width && selectedMedia.height && (
                <div className="admin-form-group">
                  <label className="admin-form-label">Dimensions</label>
                  <input type="text" className="admin-form-input" value={`${selectedMedia.width} x ${selectedMedia.height}`} readOnly />
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-form-label">URL</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="text" className="admin-form-input" value={selectedMedia.url} readOnly />
                  <button onClick={() => copyUrl(selectedMedia.url)} className="admin-btn admin-btn-secondary">
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-danger">Delete</button>
              <button className="admin-btn admin-btn-primary">Insert into Page</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
