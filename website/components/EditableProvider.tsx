"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthProvider";

interface EditableContent {
  [key: string]: string;
}

interface EditableContextType {
  isEditMode: boolean;
  isPreviewMode: boolean;
  hasDraft: boolean;
  toggleEditMode: () => void;
  enterPreviewMode: () => void;
  exitPreviewMode: () => void;
  publishDraft: () => void;
  discardDraft: () => void;
  getContent: (key: string, defaultValue: string) => string;
  setContent: (key: string, value: string) => void;
  draftChanges: number;
}

const EditableContext = createContext<EditableContextType>({
  isEditMode: false,
  isPreviewMode: false,
  hasDraft: false,
  toggleEditMode: () => {},
  enterPreviewMode: () => {},
  exitPreviewMode: () => {},
  publishDraft: () => {},
  discardDraft: () => {},
  getContent: (_key, defaultValue) => defaultValue,
  setContent: () => {},
  draftChanges: 0,
});

export function useEditable() {
  return useContext(EditableContext);
}

const PUBLISHED_KEY = "loud-legacy-cms-published";
const DRAFT_KEY = "loud-legacy-cms-draft";

function loadStorage(key: string): EditableContent {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveStorage(key: string, data: EditableContent) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function EditableProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [published, setPublished] = useState<EditableContent>({});
  const [draft, setDraft] = useState<EditableContent>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    setPublished(loadStorage(PUBLISHED_KEY));
    setDraft(loadStorage(DRAFT_KEY));
  }, []);

  const draftChanges = Object.keys(draft).length;
  const hasDraft = draftChanges > 0;

  const getContent = useCallback(
    (key: string, defaultValue: string) => {
      // In preview mode or edit mode, show draft content if it exists
      if ((isPreviewMode || isEditMode) && draft[key] !== undefined) {
        return draft[key];
      }
      // Otherwise show published content
      if (published[key] !== undefined) {
        return published[key];
      }
      return defaultValue;
    },
    [published, draft, isEditMode, isPreviewMode]
  );

  const setContent = useCallback(
    (key: string, value: string) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        saveStorage(DRAFT_KEY, next);
        return next;
      });
    },
    []
  );

  const toggleEditMode = useCallback(() => {
    if (!isSuperAdmin) return;
    setIsEditMode((prev) => !prev);
    setIsPreviewMode(false);
  }, [isSuperAdmin]);

  const enterPreviewMode = useCallback(() => {
    setIsPreviewMode(true);
    setIsEditMode(false);
  }, []);

  const exitPreviewMode = useCallback(() => {
    setIsPreviewMode(false);
    setIsEditMode(true);
  }, []);

  const publishDraft = useCallback(() => {
    const merged = { ...published, ...draft };
    setPublished(merged);
    saveStorage(PUBLISHED_KEY, merged);
    setDraft({});
    saveStorage(DRAFT_KEY, {});
    setIsPreviewMode(false);
    setIsEditMode(false);
  }, [published, draft]);

  const discardDraft = useCallback(() => {
    setDraft({});
    saveStorage(DRAFT_KEY, {});
    setIsPreviewMode(false);
  }, []);

  return (
    <EditableContext.Provider
      value={{
        isEditMode,
        isPreviewMode,
        hasDraft,
        toggleEditMode,
        enterPreviewMode,
        exitPreviewMode,
        publishDraft,
        discardDraft,
        getContent,
        setContent,
        draftChanges,
      }}
    >
      {children}

      {/* Edit Mode Toolbar - only for SUPER_ADMIN */}
      {isSuperAdmin && (
        <div className="cms-toolbar">
          {!isEditMode && !isPreviewMode && (
            <button className="cms-toolbar-btn cms-edit-btn" onClick={toggleEditMode}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Site
              {hasDraft && <span className="cms-badge">{draftChanges}</span>}
            </button>
          )}

          {isEditMode && (
            <div className="cms-toolbar-expanded">
              <div className="cms-toolbar-left">
                <span className="cms-toolbar-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Mode
                </span>
                {hasDraft && (
                  <span className="cms-changes-count">{draftChanges} unsaved change{draftChanges !== 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="cms-toolbar-right">
                {hasDraft && (
                  <>
                    <button className="cms-toolbar-btn cms-discard-btn" onClick={discardDraft}>
                      Discard
                    </button>
                    <button className="cms-toolbar-btn cms-preview-btn" onClick={enterPreviewMode}>
                      Preview
                    </button>
                    <button className="cms-toolbar-btn cms-publish-btn" onClick={publishDraft}>
                      Publish
                    </button>
                  </>
                )}
                <button className="cms-toolbar-btn cms-close-btn" onClick={toggleEditMode}>
                  Done
                </button>
              </div>
            </div>
          )}

          {isPreviewMode && (
            <div className="cms-toolbar-expanded cms-preview-bar">
              <div className="cms-toolbar-left">
                <span className="cms-toolbar-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Preview Mode
                </span>
                <span className="cms-preview-note">You are viewing unpublished changes</span>
              </div>
              <div className="cms-toolbar-right">
                <button className="cms-toolbar-btn cms-close-btn" onClick={exitPreviewMode}>
                  Back to Edit
                </button>
                <button className="cms-toolbar-btn cms-publish-btn" onClick={publishDraft}>
                  Publish Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </EditableContext.Provider>
  );
}
