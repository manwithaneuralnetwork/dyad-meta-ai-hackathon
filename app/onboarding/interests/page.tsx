"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, X } from "lucide-react";
import styles from "../../dyad.module.css";
import SmartBackButton from "../../smart-back-button";

const tags = ["Live music", "Coffee", "City walks", "Museums", "Trying new food", "Creative workshops", "Outdoor movies", "Book clubs", "Casual sports", "Volunteering", "Photography", "Game nights"];

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function InterestsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggleTag = (tag: string) => setSelected((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.onboardingPage}`}>
        <header className={styles.onboardingHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/signup" label="Back to account setup" />
          <Link href="/" aria-label="Dyad home"><Logo /></Link>
          <span className={styles.onboardingStep}>1 of 2</span>
        </header>
        <div className={styles.onboardingProgress} aria-label="Onboarding progress: step 1 of 2"><span /></div>

        <div className={styles.onboardingBody}>
          <p className={styles.eyebrow}>Make it yours</p>
          <h1>What are you into?</h1>
          <p className={styles.onboardingLead}>Pick at least five. This helps us find plans you’d actually say yes to.</p>

          <section className={styles.selectedTagsSection}>
            <div className={styles.tagSectionHeading}><h2>Your picks</h2><span>{selected.length} selected</span></div>
            <div className={styles.selectedTags} aria-live="polite">
              {selected.length ? selected.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}>{tag}<X size={13} aria-hidden="true" /></button>
              )) : <p>Tap a tag below to add it here.</p>}
            </div>
          </section>

          <section className={styles.availableTagsSection}>
            <h2>Explore interests</h2>
            <div className={styles.availableTags}>
              {tags.filter((tag) => !selected.includes(tag)).map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}><Plus size={13} aria-hidden="true" />{tag}</button>
              ))}
            </div>
          </section>
        </div>

        <footer className={styles.onboardingFooter}>
          <span>{selected.length < 5 ? `${5 - selected.length} more to go` : "Looking good"}</span>
          <Link className={styles.onboardingNext} href="/onboarding/location">Next<ArrowRight size={17} /></Link>
        </footer>
      </section>
    </main>
  );
}
