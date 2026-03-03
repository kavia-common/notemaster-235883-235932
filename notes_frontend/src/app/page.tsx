"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createNote, deleteNote, getNote, listNotes, listTags, patchNote, updateNote } from "@/lib/api";
import type { Note, NoteCreate, NoteUpdate } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAutosaveNote } from "@/hooks/useAutosaveNote";
import { NoteList } from "@/components/NoteList";
import { TagChips } from "@/components/TagChips";
import { NoteEditor } from "@/components/NoteEditor";

function dedupeSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);

  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Draft edits for the active note (autosaved)
  const [draft, setDraft] = useState<NoteUpdate>({});

  const { status: autosaveStatus, error: autosaveError, loadDraftFor } = useAutosaveNote({
    note: activeNote,
    changes: draft,
    enabled: Boolean(activeNote) && (draft.title !== undefined || draft.content !== undefined || draft.tags !== undefined || draft.pinned !== undefined),
    delayMs: 900,
    onSaved: (saved) => {
      setActiveNote(saved);
      setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
      setDraft({});
    },
  });

  const derivedTags = useMemo(() => {
    const fromNotes = notes.flatMap((n) => n.tags ?? []);
    return dedupeSorted([...knownTags, ...fromNotes]);
  }, [knownTags, notes]);

  const sortedNotes = useMemo(() => {
    const pinned = notes.filter((n) => n.pinned);
    const others = notes.filter((n) => !n.pinned);
    const byUpdated = (a: Note, b: Note) =>
      String(b.updated_at ?? b.created_at ?? "").localeCompare(String(a.updated_at ?? a.created_at ?? ""));
    return [...pinned.sort(byUpdated), ...others.sort(byUpdated)];
  }, [notes]);

  const activeIdResolved = activeNote?.id ?? activeId;

  const refreshList = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await listNotes({
        q: debouncedSearch,
        tag: selectedTag ?? undefined,
        pinned: pinnedOnly ? true : undefined,
      });
      setNotes(res.items);
      if (activeIdResolved && !res.items.some((n) => n.id === activeIdResolved)) {
        // active note may have been filtered out; keep it in editor but unset list selection
        setActiveId(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load notes";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedTag, pinnedOnly, activeIdResolved]);

  const refreshTags = useCallback(async () => {
    try {
      const t = await listTags();
      setKnownTags(dedupeSorted(t));
    } catch {
      // optional endpoint; ignore
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  const openNote = useCallback(
    async (id: string) => {
      setError(null);
      setBusy("Opening note…");
      try {
        const note = await getNote(id);
        setActiveId(id);
        setActiveNote(note);

        // Load any local draft for resilience
        const maybeDraft = loadDraftFor(id);
        setDraft(maybeDraft ?? {});
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to open note";
        setError(msg);
      } finally {
        setBusy(null);
      }
    },
    [loadDraftFor]
  );

  const createNew = useCallback(async () => {
    setError(null);
    setBusy("Creating note…");
    try {
      const payload: NoteCreate = {
        title: "Untitled",
        content: "",
        tags: [],
        pinned: false,
      };
      const created = await createNote(payload);
      setNotes((prev) => [created, ...prev]);
      setActiveId(created.id);
      setActiveNote(created);
      setDraft({});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create note";
      setError(msg);
    } finally {
      setBusy(null);
    }
  }, []);

  const onTogglePinned = useCallback(async () => {
    if (!activeNote) return;
    const nextPinned = !(draft.pinned ?? activeNote.pinned);
    setDraft((d) => ({ ...d, pinned: nextPinned }));

    // Also do an immediate lightweight save for pin toggle (feels snappy)
    try {
      const saved = await patchNote(activeNote.id, { pinned: nextPinned });
      setActiveNote(saved);
      setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
      setDraft((d) => {
        // Remove pinned from draft after server-ack so autosave doesn't re-send it.
        const { pinned, ...rest } = d;
        void pinned;
        return rest;
      });
    } catch {
      // Let autosave attempt later; status will show error if it fails there
    }
  }, [activeNote, draft.pinned]);

  const onDelete = useCallback(async () => {
    if (!activeNote) return;
    const ok = window.confirm(
      `Delete "${activeNote.title || "Untitled"}"? This cannot be undone.`
    );
    if (!ok) return;

    setError(null);
    setBusy("Deleting…");
    try {
      await deleteNote(activeNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== activeNote.id));
      setActiveNote(null);
      setActiveId(null);
      setDraft({});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete note";
      setError(msg);
    } finally {
      setBusy(null);
    }
  }, [activeNote]);

  // Manual save shortcut (optional; autosave is primary)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!activeNote) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const payload = draft;
        if (!Object.keys(payload).length) return;

        (async () => {
          setBusy("Saving…");
          try {
            let saved: Note;
            try {
              saved = await patchNote(activeNote.id, payload);
            } catch {
              saved = await updateNote(activeNote.id, payload);
            }
            setActiveNote(saved);
            setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
            setDraft({});
          } finally {
            setBusy(null);
          }
        })();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeNote, draft]);

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-[1280px] mx-auto">
        <header className="mb-4 md:mb-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                NoteMaster <span className="muted">/ retro notes</span>
              </h1>
              <p className="muted text-sm">
                Tags, pinning, markdown preview, autosave, and search.{" "}
                <span className="kbd">Ctrl</span>+<span className="kbd">S</span> saves manually.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn btnPrimary" type="button" onClick={createNew}>
                + New note
              </button>
              <a className="btn" href="/api-help" title="Backend connectivity tips">
                API help
              </a>
            </div>
          </div>

          {error ? (
            <div className="panel" role="alert" aria-live="assertive">
              <div className="panelBody">
                <p style={{ color: "var(--danger)" }} className="font-semibold">
                  {error}
                </p>
                <p className="muted text-sm mt-2">
                  Ensure <span className="kbd">NEXT_PUBLIC_API_BASE_URL</span> is set and the backend is running.
                </p>
              </div>
            </div>
          ) : null}

          {busy ? (
            <div className="badge" aria-live="polite">
              <span className="kbd">…</span> {busy}
            </div>
          ) : null}
        </header>

        <div className="appShell gap-4 md:gap-6">
          {/* Sidebar */}
          <aside className="panel p-0 h-fit md:sticky md:top-6">
            <div className="panelHeader">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Notes</h2>
                <p className="muted text-sm">
                  {loading ? "Loading…" : `${notes.length} result${notes.length === 1 ? "" : "s"}`}
                </p>
              </div>

              <label className="badge" title="Show pinned only">
                <input
                  type="checkbox"
                  checked={pinnedOnly}
                  onChange={(e) => setPinnedOnly(e.target.checked)}
                  aria-label="Pinned only"
                />
                pinned
              </label>
            </div>

            <div className="panelBody grid gap-3">
              <label className="grid gap-1">
                <span className="muted text-sm">Search</span>
                <input
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title/content…"
                />
              </label>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="muted text-sm">Tags</span>
                  {selectedTag ? (
                    <button type="button" className="btn" onClick={() => setSelectedTag(null)}>
                      Clear
                    </button>
                  ) : null}
                </div>
                <TagChips tags={derivedTags} selected={selectedTag} onSelect={setSelectedTag} />
              </div>

              <hr className="hr" />

              <NoteList
                notes={sortedNotes}
                activeId={activeIdResolved}
                onSelect={(id) => void openNote(id)}
              />
            </div>
          </aside>

          {/* Editor */}
          <section className="min-w-0">
            <NoteEditor
              note={activeNote}
              draft={draft}
              onDraftChange={setDraft}
              autosaveStatus={autosaveStatus}
              autosaveError={autosaveError}
              onTogglePinned={onTogglePinned}
              onDelete={onDelete}
              onCreateNew={createNew}
            />

            <div className="mt-3 muted text-sm">
              Tip: Use tags like <span className="kbd">retro</span>, <span className="kbd">todo</span>,{" "}
              <span className="kbd">ideas</span>. Markdown supports headings, lists, links, and code.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
