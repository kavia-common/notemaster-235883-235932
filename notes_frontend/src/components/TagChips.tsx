"use client";

type Props = {
  tags: string[];
  selected?: string | null;
  onSelect?: (tag: string | null) => void;
  compact?: boolean;
};

// PUBLIC_INTERFACE
export function TagChips({ tags, selected, onSelect, compact }: Props) {
  /** Renders selectable tag chips; selection can be cleared by clicking the active tag. */
  if (!tags.length) {
    return <p className="muted text-sm">No tags yet.</p>;
  }

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
      {tags.map((t) => {
        const active = selected === t;
        return (
          <button
            key={t}
            type="button"
            className={"tag tagButton" + (active ? " ring-2 ring-cyan-400/60" : "")}
            onClick={() => onSelect?.(active ? null : t)}
            aria-pressed={active}
            title={active ? "Clear tag filter" : `Filter by tag: ${t}`}
          >
            #{t}
          </button>
        );
      })}
    </div>
  );
}
