"use client";

import { useState } from "react";
import styles from "../dyad.module.css";

export default function MuseComposerInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const parts = value.split(/(@muse)/gi);

  return (
    <span className={styles.museComposerField}>
      {value ? <span className={styles.museComposerMirror} aria-hidden="true" style={{ transform: `translateX(${-scrollLeft}px)` }}>{parts.map((part, index) => /^@muse$/i.test(part) ? <strong key={`${part}-${index}`}>{part}</strong> : <span key={`${part}-${index}`}>{part}</span>)}</span> : null}
      <input
        aria-label="Message the group"
        maxLength={2000}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
        placeholder="Message · @muse for help"
        value={value}
      />
    </span>
  );
}
