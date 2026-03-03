"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note, NoteUpdate } from "@/lib/types";

function normalizeTagsInput(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^#/, ""));
}

type Props = {
  note: Note | null;
  draft: NoteUpdate;
  onDraftChange: (next: NoteUpdate) => void;

  autosaveStatus: "idle" | "dirty" | "saving" | "saved" | "error";
  autosaveError: string | null;

  onTogglePinned: () => void;
  onDelete: () => void;
  onCreateNew: () => void;
};

// PUBLIC_INTERFACE
export function NoteEditor(props: Props) {
  /** Main note editor with split markdown preview and retro UI controls. */
  const {
    note,
    draft,
    onDraftChange,
    autosaveStatus,
    autosaveError,
    onTogglePinned,
    onDelete,
    onCreateNew,
  } = props;

  const [showPreview, setShowPreview] = useState(true);

  const tagsText = useMemo(() => (draft.tags ?? note?.tags ?? []).join(", "), [draft.tags, note]);

  useEffect(() => {
    // On mobile, default to editor-only until user toggles preview.
    if (window.matchMedia("(max-width: 880px)").matches) {
      setShowPreview(false);
    }
  }, []);

  if (!note) {
    return (
      <section className="panel" aria-label="Editor">
        <header className="panelHeader">
          <div>
            <div className="badge">
              <span className="kbd">N</span> new note
            </div>
            <h2 className="text-lg font-semibold">No note selected</h2>
          </div>
          <button type="button" className="btn btnPrimary" onClick={onCreateNew}>
            + Create
          </button>
        </header>
        <div className="panelBody">
          <p className="muted">
            Select a note on the left, or create a new one. This app supports tags, pinning, basic
            markdown, and autosave.
          </p>
        </div>
      </section>
    );
  }

  const title = (draft.title ?? note.title) as string;
  const content = (draft.content ?? note.content) as string;
  const pinned = (draft.pinned ?? note.pinned) as boolean;
  const tags = (draft.tags ?? note.tags) as string[];

  const statusLabel =
    autosaveStatus === "saving"
      ? "Saving…"
      : autosaveStatus === "saved"
        ? "Saved"
        : autosaveStatus === "error"
          ? "Error"
          : autosaveStatus === "dirty"
            ? "Unsaved"
            : "Idle";

  return (
    <section className="panel" aria-label="Editor">
      <header className="panelHeader">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">
              <span className="kbd">⌘</span>
              <span className="kbd">S</span>
              autosave
            </span>
            <span
              className={
                "tag " +
                (autosaveStatus === "error"
                  ? "ring-2 ring-red-400/60"
                  : autosaveStatus === "saving"
                    ? "ring-2 ring-cyan-400/60"
                    : autosaveStatus === "saved"
                      ? "ring-2 ring-green-400/60"
                      : "")
              }
              aria-live="polite"
            >
              {statusLabel}
            </span>
            {pinned ? <span className="tag">★ pinned</span> : <span className="tag">☆</span>}
          </div>
          {autosaveError ? (
            <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>
              {autosaveError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          <button type="button" className="btn" onClick={onTogglePinned}>
            {pinned ? "Unpin" : "Pin"}
          </button>
          <button type="button" className="btn btnDanger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </header>

      <div className="panelBody">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="muted text-sm">Title</span>
            <input
              className="input"
              value={title}
              onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
              placeholder="Untitled note…"
            />
          </label>

          <label className="grid gap-1">
            <span className="muted text-sm">Tags (comma-separated)</span>
            <input
              className="input"
              value={tagsText}
              onChange={(e) => onDraftChange({ ...draft, tags: normalizeTagsInput(e.target.value) })}
              placeholder="retro, ideas, todo"
            />
            {tags.length ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="tag">
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </label>

          <hr className="hr" />

          {showPreview ? (
            <div className="split">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="muted text-sm">Markdown</span>
                  <span className="badge">
                    <span className="kbd">Ctrl</span>
                    <span className="kbd">Enter</span> new line
                  </span>
                </div>
                <textarea
                  className="textarea"
                  value={content}
                  onChange={(e) => onDraftChange({ ...draft, content: e.target.value })}
                  placeholder={"# Hello\n\n- Write notes\n- Use **markdown**\n- Add `tags`\n"}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="muted text-sm">Preview</span>
                  <span className="badge">GFM enabled</span>
                </div>
                <div className="panel" style={{ borderRadius: "12px" }}>
                  <div className="panelBody md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing to preview*"}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <label className="grid gap-1">
              <span className="muted text-sm">Markdown</span>
              <textarea
                className="textarea"
                value={content}
                onChange={(e) => onDraftChange({ ...draft, content: e.target.value })}
                placeholder={"# Hello\n\n- Write notes\n- Use **markdown**\n- Add `tags`\n"}
              />
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
