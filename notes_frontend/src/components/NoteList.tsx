"use client";

import type { Note } from "@/lib/types";

type Props = {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

// PUBLIC_INTERFACE
export function NoteList({ notes, activeId, onSelect }: Props) {
  /** Renders the list of notes in the sidebar, highlighting the active note. */
  return (
    <div className="noteList" role="list" aria-label="Notes">
      {notes.map((n) => {
        const active = n.id === activeId;
        return (
          <button
            key={n.id}
            type="button"
            role="listitem"
            className={"noteItem" + (active ? " noteItemActive" : "")}
            onClick={() => onSelect(n.id)}
            aria-current={active ? "true" : "false"}
          >
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{n.title || "Untitled"}</span>
                {n.pinned ? (
                  <span className="tag" aria-label="Pinned">
                    PIN
                  </span>
                ) : null}
              </div>
              <p className="muted text-sm truncate">
                {n.content?.trim() ? n.content.trim().replace(/\s+/g, " ") : "No content"}
              </p>
              {n.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {n.tags.slice(0, 3).map((t) => (
                    <span key={t} className="tag">
                      #{t}
                    </span>
                  ))}
                  {n.tags.length > 3 ? <span className="tag">+{n.tags.length - 3}</span> : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="badge" title={n.updated_at ?? n.created_at ?? ""}>
                {n.updated_at ? "upd" : "new"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
