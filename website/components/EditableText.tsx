"use client";

import { useState, useRef, useEffect } from "react";
import { useEditable } from "./EditableProvider";

interface EditableTextProps {
  contentKey: string;
  defaultValue: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span" | "div" | "li";
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}

export default function EditableText({
  contentKey,
  defaultValue,
  as: Tag = "div",
  className = "",
  style = {},
  multiline = false,
}: EditableTextProps) {
  const { isEditMode, getContent, setContent } = useEditable();
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const displayValue = getContent(contentKey, defaultValue);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!isEditMode) {
    return (
      <Tag className={className} style={style}>
        {displayValue}
      </Tag>
    );
  }

  if (editing) {
    return (
      <div className="editable-field-wrapper" style={style}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="editable-textarea"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditing(false);
              }
              if (e.key === "Enter" && !e.shiftKey && !multiline) {
                setContent(contentKey, localValue);
                setEditing(false);
              }
            }}
            rows={3}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            className="editable-input"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter") {
                setContent(contentKey, localValue);
                setEditing(false);
              }
            }}
          />
        )}
        <div className="editable-actions">
          <button
            className="editable-save"
            onClick={() => {
              setContent(contentKey, localValue);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button className="editable-cancel" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <Tag
      className={`${className} editable-highlight`}
      style={{ ...style, cursor: "pointer" }}
      onClick={() => {
        setLocalValue(displayValue);
        setEditing(true);
      }}
      title="Click to edit"
    >
      {displayValue}
      <span className="editable-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </span>
    </Tag>
  );
}
