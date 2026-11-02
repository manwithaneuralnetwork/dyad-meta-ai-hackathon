"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus, UserRound, X } from "lucide-react";
import styles from "../dyad.module.css";
import { type ActivityRecord, type PublicProfile, type Viewer } from "@/lib/activity-data";
import { listFriends } from "@/lib/friend-data";
import { inviteMoreToGroup } from "@/lib/group-data";
import { toggleInviteSelection } from "@/lib/group-rules";

export default function InvitePeopleSheet({ activity, groupId, memberIds, onClose, onInvited, open, viewer }: {
  activity: ActivityRecord;
  groupId: string;
  memberIds: string[];
  onClose: () => void;
  onInvited: (count: number) => void;
  open: boolean;
  viewer: Viewer;
}) {
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    listFriends(viewer)
      .then((profiles) => setPeople(profiles.filter((profile) => !memberIds.includes(profile.id))))
      .catch(() => setError("We couldn’t load more people right now."))
      .finally(() => setLoading(false));
  }, [activity.id, memberIds, open, viewer]);

  if (!open) return null;

  async function invite() {
    if (!selected.length) return;
    setBusy(true);
    setError("");
    try {
      const count = await inviteMoreToGroup(groupId, selected);
      setSelected([]);
      onInvited(count);
      onClose();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Those invitations couldn’t be sent.");
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.sheetLayer}>
    <button className={styles.sheetScrim} type="button" aria-label="Close invite people" onClick={onClose} />
    <section className={styles.companySheet} role="dialog" aria-modal="true" aria-labelledby="invite-people-title">
      <div className={styles.sheetHandle} />
      <header className={styles.sheetHeader}><div><p>{activity.title}</p><h2 id="invite-people-title">Invite more people</h2></div><button className={styles.sheetClose} type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
      <p className={styles.selectionHint}>Invite accepted Friends to this plan. A group can have up to 11 people total.</p>
      {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
      <div className={styles.peopleList}>
        {loading ? <p className={styles.peopleEmpty}>Loading Friends…</p> : null}
        {!loading && !people.length ? <p className={styles.peopleEmpty}>No additional Friends are available to invite.</p> : null}
        {people.map((person) => <div className={styles.personOption} key={person.id}>
          <Link className={styles.personProfileLink} href={`/profile?person=${person.id}`}><span className={`${styles.personAvatar} ${styles.avatar_aqua}`}><UserRound size={20} /></span><span className={styles.personCopy}><span className={styles.personNameLine}><strong className={styles.personName}>{person.display_name || "Dyad member"}</strong><span className={styles.attendanceBadge}>{person.attended_count} attended</span></span>{person.one_liner ? <span className={styles.personIntro}>“{person.one_liner}”</span> : null}</span></Link>
          <label className={styles.checkboxLabel}><input type="checkbox" checked={selected.includes(person.id)} onChange={() => setSelected((current) => toggleInviteSelection(current, person.id))} aria-label={`Invite ${person.display_name || "this member"}`} /><span className={styles.checkboxMark}><Check size={14} /></span></label>
        </div>)}
      </div>
      <footer className={styles.sheetFooter}><button className={styles.createGroupButton} type="button" disabled={!selected.length || busy} onClick={() => void invite()}><Plus size={17} />{busy ? "Sending…" : selected.length ? `Send ${selected.length} ${selected.length === 1 ? "invite" : "invites"}` : "Select someone first"}</button></footer>
    </section>
  </div>;
}
