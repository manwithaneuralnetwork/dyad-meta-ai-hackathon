"use client";

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import SettingsShell from "../settings-shell";
import styles from "../../dyad.module.css";

const allInterests = ["Live music", "Coffee", "City walks", "Museums", "Trying new food", "Creative workshops", "Outdoor movies", "Book clubs", "Casual sports", "Volunteering", "Photography", "Game nights"];
const defaults = ["Live music", "Museums", "Coffee", "Creative workshops"];

export default function InterestsSettingsPage() {
  const [selected, setSelected] = useState<string[]>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("dyad-interests");
    if (stored) setSelected(JSON.parse(stored));
  }, []);

  function toggle(tag: string) {
    setSaved(false);
    setSelected((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  function save() {
    if (selected.length < 5) return;
    sessionStorage.setItem("dyad-interests", JSON.stringify(selected));
    setSaved(true);
  }

  const saveLabel = saved
    ? `Saved ${selected.length} interests`
    : selected.length >= 5
      ? `Save ${selected.length} interests`
      : `${selected.length}/5 picks`;

  return (
    <SettingsShell eyebrow="Discovery preferences" title="Interests">
      <p className={styles.settingsLead}>Choose what you’d genuinely be excited to do.</p>
      <section className={styles.selectedTagsSection}>
        <div className={styles.tagSectionHeading}><h2>Your interests</h2><span>{selected.length} selected</span></div>
        <div className={styles.selectedTags}>{selected.map((tag) => <button key={tag} type="button" onClick={() => toggle(tag)}>{tag}<X size={13} /></button>)}</div>
      </section>
      <section className={styles.availableTagsSection}>
        <h2>Add more</h2>
        <div className={styles.availableTags}>{allInterests.filter((tag) => !selected.includes(tag)).map((tag) => <button key={tag} type="button" onClick={() => toggle(tag)}><Plus size={13} />{tag}</button>)}</div>
      </section>
      <button className={`${styles.settingsSaveButton} ${styles.interestsSaveButton}`} type="button" onClick={save} disabled={selected.length < 5}>
        {saved ? <><Check size={17} />{saveLabel}</> : saveLabel}
      </button>
    </SettingsShell>
  );
}
