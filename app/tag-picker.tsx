"use client";

import { Search, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./dyad.module.css";

const INITIAL_VISIBLE = 14;

export default function TagPicker({
  allTags,
  selected,
  onChange,
  loading = false,
  selectedHeading = "Your picks",
  availableHeading = "Explore interests",
}: {
  allTags: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  selectedHeading?: string;
  availableHeading?: string;
}) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const available = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = allTags.filter((tag) => !selectedSet.has(tag) && (!normalizedQuery || tag.toLowerCase().includes(normalizedQuery)));
    return normalizedQuery ? matches : matches.slice(0, visibleCount);
  }, [allTags, query, selectedSet, visibleCount]);

  function add(tag: string) {
    onChange([...selected, tag]);
    setVisibleCount((count) => count + 1);
  }

  return (
    <>
      <section className={styles.selectedTagsSection}>
        <div className={styles.tagSectionHeading}><h2>{selectedHeading}</h2><span>{selected.length} selected</span></div>
        <div className={styles.selectedTags} aria-live="polite">
          {selected.length ? selected.map((tag) => (
            <button key={tag} type="button" onClick={() => onChange(selected.filter((item) => item !== tag))}>{tag}<X size={13} aria-hidden="true" /></button>
          )) : <p>{loading ? "Loading your picks…" : "Tap a tag below to add it here."}</p>}
        </div>
      </section>

      <section className={styles.availableTagsSection}>
        <h2>{availableHeading}</h2>
        <label className={styles.tagSearch}>
          <Search size={15} aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search interests" aria-label="Search interests" />
        </label>
        <div className={styles.availableTags}>
          {available.map((tag) => (
            <button key={tag} type="button" onClick={() => add(tag)} disabled={loading}><Plus size={13} aria-hidden="true" />{tag}</button>
          ))}
          {!available.length && !loading ? <p className={styles.tagNoResults}>No interests match “{query.trim()}”.</p> : null}
        </div>
      </section>
    </>
  );
}
