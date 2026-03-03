"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { patchNote, updateNote } from "@/lib/api";
import type { Note, NoteUpdate } from "@/lib/types";

type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function stableStringify(obj: unknown): string {
  return JSON.stringify(obj ?? null);
}

function draftKey(noteId: string): string {
  return `notemaster:draft:${noteId}`;
}

// PUBLIC_INTERFACE
export function useAutosaveNote(args: {
  note: Note | null;
  changes: NoteUpdate;
  enabled: boolean;
  delayMs: number;
  onSaved?: (note: Note) => void;
}) {
  /**
   * Autosaves `changes` for `note` after `delayMs` of inactivity.
   * Also persists a localStorage draft, so refreshes don't lose edits.
   */
  const { note, changes, enabled, delayMs, onSaved } = args;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const latestChangesRef = useRef<NoteUpdate>(changes);
  latestChangesRef.current = changes;

  const snapshot = useMemo(() => stableStringify(changes), [changes]);

  // Draft persistence
  useEffect(() => {
    if (!note) return;
    try {
      window.localStorage.setItem(draftKey(note.id), snapshot);
    } catch {
      // ignore quota / disabled storage
    }
  }, [note, snapshot]);

  // Mark dirty when changes diverge from base note
  useEffect(() => {
    if (!enabled || !note) return;
    setStatus("dirty");
  }, [enabled, note, snapshot]);

  useEffect(() => {
    if (!enabled || !note) return;

    setError(null);

    const t = window.setTimeout(async () => {
      try {
        setStatus("saving");

        // Prefer PATCH; fall back to PUT if PATCH isn't supported
        let saved: Note;
        try {
          saved = await patchNote(note.id, latestChangesRef.current);
        } catch (err: unknown) {
          // If PATCH is unsupported or fails, try PUT.
          saved = await updateNote(note.id, latestChangesRef.current);
          void err;
        }

        setStatus("saved");
        onSaved?.(saved);

        // Clear draft after successful save
        try {
          window.localStorage.removeItem(draftKey(note.id));
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        setStatus("error");
        const msg = err instanceof Error ? err.message : "Autosave failed";
        setError(msg);
      }
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [enabled, note, delayMs, onSaved, snapshot]);

  // PUBLIC_INTERFACE
  function loadDraftFor(noteId: string): NoteUpdate | null {
    /** Loads a localStorage draft for a note, if present. */
    try {
      const raw = window.localStorage.getItem(draftKey(noteId));
      if (!raw) return null;
      return JSON.parse(raw) as NoteUpdate;
    } catch {
      return null;
    }
  }

  return { status, error, loadDraftFor };
}
