"use client";

import { useEffect, useState } from "react";
import { Check, Plus, UserRound, UsersRound, X } from "lucide-react";
import Link from "next/link";
import styles from "../dyad.module.css";
import { listDiscoverableProfiles, type ActivityRecord, type PublicProfile, type Viewer } from "@/lib/activity-data";

export default function FindCompanySheet({
  activity,
  viewer,
  initiallyOpen = false,
  onActivate,
}: {
  activity: ActivityRecord;
  viewer: Viewer;
  initiallyOpen?: boolean;
  onActivate: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    listDiscoverableProfiles(activity.id, viewer)
      .then((profiles) => { if (active) setPeople(profiles); })
      .catch(() => { if (active) setError("We couldn’t load people for this activity."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activity.id, open, viewer]);

  async function requestOpen() {
    if (await onActivate()) setOpen(true);
  }

  function togglePerson(userId: string) {
    setSelected((current) => current.includes(userId) ? current.filter((id) => id !== userId) : current.length < 10 ? [...current, userId] : current);
  }

  return (
    <>
      <button className={`${styles.activityAction} ${styles.activityActionDark}`} type="button" onClick={() => void requestOpen()}>
        <UsersRound size={16} />Find company
      </button>

      {open && (
        <div className={styles.sheetLayer}>
          <button className={styles.sheetScrim} type="button" aria-label="Close find company" onClick={() => setOpen(false)} />
          <section className={styles.companySheet} role="dialog" aria-modal="true" aria-labelledby="company-sheet-title">
            <div className={styles.sheetHandle} />
            <header className={styles.sheetHeader}>
              <div><p>{activity.title}</p><h2 id="company-sheet-title">Who should join?</h2></div>
              <button className={styles.sheetClose} type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
            </header>
            <p className={styles.selectionHint}>Choose at least one person, up to 10. They’ll receive an invite when you create the group.</p>

            {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
            <div className={styles.peopleList}>
              {loading ? <p className={styles.peopleEmpty}>Looking for interested people…</p> : null}
              {!loading && viewer.kind === "demo" ? <p className={styles.peopleEmpty}>Demo mode stays separate from real members, so no profiles are shown here.</p> : null}
              {!loading && viewer.kind === "anonymous" ? <p className={styles.peopleEmpty}>Log in or choose demo mode before looking for company.</p> : null}
              {!loading && viewer.kind === "real" && !people.length ? <p className={styles.peopleEmpty}>No one else is looking for company yet. You’re now visible to people interested in this activity.</p> : null}
              {people.map((person) => (
                <div className={styles.personOption} key={person.id}>
                  <Link className={styles.personProfileLink} href={`/profile?person=${person.id}`} aria-label={`View ${person.display_name}'s profile`}>
                    <span className={`${styles.personAvatar} ${styles.avatar_aqua}`}><UserRound size={20} /></span>
                    <span className={styles.personCopy}>
                      <span className={styles.personNameLine}><strong className={styles.personName}>{person.display_name || "Dyad member"}</strong><span className={styles.attendanceBadge}>{person.attended_count} attended</span></span>
                      {person.one_liner ? <span className={styles.personIntro}>“{person.one_liner}”</span> : null}
                    </span>
                  </Link>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" aria-label={`Invite ${person.display_name || "this member"}`} checked={selected.includes(person.id)} onChange={() => togglePerson(person.id)} />
                    <span className={styles.checkboxMark}><Check size={14} /></span>
                  </label>
                </div>
              ))}
            </div>

            <footer className={styles.sheetFooter}>
              <button className={styles.createGroupButton} type="button" disabled={!selected.length}><Plus size={17} />{selected.length ? `Create Group · ${selected.length}` : "Select someone first"}</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
