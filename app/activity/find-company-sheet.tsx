"use client";

import { useEffect, useState } from "react";
import { Check, Plus, UserRound, UsersRound, X } from "lucide-react";
import Link from "next/link";
import styles from "../dyad.module.css";

const people = [
  { name: "Maya Chen", slug: "maya", tone: "aqua", attended: 14, intro: "Always down for live music and a walk after." },
  { name: "Eli Brooks", slug: "eli", tone: "ink", attended: 8, intro: "Here for good songs, bad jokes, and new faces." },
  { name: "Sofia Martin", slug: "sofia", tone: "mist", attended: 3, intro: "New to the city—show me your favorite spot." },
  { name: "Jordan Lee", slug: "jordan", tone: "aqua", attended: 21, intro: "I’ll bring the curiosity if you bring the plan." },
  { name: "Priya Shah", slug: "priya", tone: "ink", attended: 11, intro: "Low-key plans and thoughtful conversation." },
  { name: "Noah Williams", slug: "noah", tone: "mist", attended: 6, intro: "Weekend explorer with an extra concert ticket." },
] as const;

export default function FindCompanySheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button className={`${styles.activityAction} ${styles.activityActionDark}`} type="button" onClick={() => setOpen(true)}>
        <UsersRound size={16} />Find company
      </button>

      {open && (
        <div className={styles.sheetLayer}>
          <button className={styles.sheetScrim} type="button" aria-label="Close find company" onClick={() => setOpen(false)} />
          <section className={styles.companySheet} role="dialog" aria-modal="true" aria-labelledby="company-sheet-title">
            <div className={styles.sheetHandle} />
            <header className={styles.sheetHeader}>
              <div>
                <p>Jazz in the Courtyard</p>
                <h2 id="company-sheet-title">Who should join?</h2>
              </div>
              <button className={styles.sheetClose} type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
            </header>

            <p className={styles.selectionHint}>Choose at least one person, up to 10. They’ll receive an invite when you create the group.</p>

            <div className={styles.peopleList}>
              {people.map((person) => (
                <div className={styles.personOption} key={person.name}>
                  <Link className={styles.personProfileLink} href={`/profile?person=${person.slug}`} aria-label={`View ${person.name}'s profile`}>
                    <span className={`${styles.personAvatar} ${styles[`avatar_${person.tone}`]}`}><UserRound size={20} /></span>
                    <span className={styles.personCopy}>
                      <span className={styles.personNameLine}>
                        <strong className={styles.personName}>{person.name}</strong>
                        <span className={styles.attendanceBadge}>{person.attended} attended</span>
                      </span>
                      <span className={styles.personIntro}>“{person.intro}”</span>
                    </span>
                  </Link>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" aria-label={`Invite ${person.name}`} />
                    <span className={styles.checkboxMark}><Check size={14} /></span>
                  </label>
                </div>
              ))}
            </div>

            <footer className={styles.sheetFooter}>
              <Link className={styles.createGroupButton} href="/group" onClick={() => setOpen(false)}><Plus size={17} />Create Group</Link>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
