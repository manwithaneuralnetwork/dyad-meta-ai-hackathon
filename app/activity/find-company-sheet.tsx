"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Plus, Sparkles, UserRound, UsersRound, X } from "lucide-react";
import Link from "next/link";
import styles from "../dyad.module.css";
import { type ActivityRecord, type PublicProfile, type Viewer } from "@/lib/activity-data";
import { MATCHMAKING_PRESETS, type ActivityMatchmakingEntry, type ActivityMatchmakingStatus } from "@/lib/activity-matchmaking";
import { listFriends } from "@/lib/friend-data";
import { createActivityGroup } from "@/lib/group-data";
import { toggleInviteSelection } from "@/lib/group-rules";

export default function FindCompanySheet({ activity, viewer, initiallyOpen = false, openSignal = 0, status, onStatusChange }: {
  activity: ActivityRecord;
  viewer: Viewer;
  initiallyOpen?: boolean;
  openSignal?: number;
  status?: ActivityMatchmakingStatus | null;
  onStatusChange?: (status: ActivityMatchmakingStatus) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [preferenceIndex, setPreferenceIndex] = useState(1);
  const [matchEntry, setMatchEntry] = useState<ActivityMatchmakingEntry | null>(status?.entry ?? null);
  const [waitingCount, setWaitingCount] = useState(status?.waitingCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"matching" | "friends" | "cancel" | null>(null);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!status) return;
    setMatchEntry(status.entry);
    setWaitingCount(status.waitingCount);
  }, [status]);

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
    setNotice("");
    if (viewer.kind !== "real") {
      setFriends([]);
      setLoading(false);
      return;
    }
    Promise.all([
      listFriends(viewer),
      fetch(`/api/activities/${activity.id}/matchmaking`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json() as { entry?: ActivityMatchmakingEntry | null; waitingCount?: number; error?: string };
        if (!response.ok) throw new Error(payload.error || "Matchmaking status couldn’t be loaded.");
        return payload;
      }),
    ])
      .then(([nextFriends, status]) => {
        if (!active) return;
        setFriends(nextFriends);
        setMatchEntry(status.entry ?? null);
        setWaitingCount(status.waitingCount ?? 0);
        onStatusChange?.({ entry: status.entry ?? null, waitingCount: status.waitingCount ?? 0 });
        if (status.entry) {
          const index = MATCHMAKING_PRESETS.findIndex((preset) => preset.min === status.entry?.min_group_size && preset.max === status.entry?.max_group_size);
          if (index >= 0) setPreferenceIndex(index);
        }
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Company options couldn’t be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activity.id, onStatusChange, open, viewer]);

  async function joinMatchmaking() {
    if (viewer.kind !== "real") {
      setError(viewer.kind === "demo" ? "Live matchmaking uses real accounts so people can receive invitations." : "Log in before joining matchmaking.");
      return;
    }
    const preference = MATCHMAKING_PRESETS[preferenceIndex];
    setBusy("matching");
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/activities/${activity.id}/matchmaking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minGroupSize: preference.min, maxGroupSize: preference.max }),
      });
      const payload = await response.json() as { matched?: boolean; groupId?: string; reason?: string; waitingCount?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "You couldn’t join matchmaking.");
      if (payload.matched && payload.groupId) {
        setNotice(payload.reason || "Muse found a compatible group.");
        router.push(`/group?id=${payload.groupId}`);
        return;
      }
      const nextWaitingCount = payload.waitingCount ?? waitingCount + 1;
      const nextEntry: ActivityMatchmakingEntry = { user_id: viewer.userId, activity_id: activity.id, min_group_size: preference.min, max_group_size: preference.max, status: "waiting", group_id: null, match_reason: "", created_at: matchEntry?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString() };
      setWaitingCount(nextWaitingCount);
      setMatchEntry(nextEntry);
      onStatusChange?.({ entry: nextEntry, waitingCount: nextWaitingCount });
      setNotice("You’re in the matching pool. We’ll send an invitation as soon as a compatible group is ready.");
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "You couldn’t join matchmaking.");
    } finally {
      setBusy(null);
    }
  }

  async function leaveMatchmaking() {
    if (viewer.kind !== "real") return;
    setBusy("cancel");
    setError("");
    try {
      const response = await fetch(`/api/activities/${activity.id}/matchmaking`, { method: "DELETE" });
      if (!response.ok) throw new Error("Matchmaking couldn’t be paused.");
      const nextEntry = matchEntry ? { ...matchEntry, status: "cancelled" as const, group_id: null } : null;
      const nextWaitingCount = Math.max(0, waitingCount - 1);
      setMatchEntry(nextEntry);
      setWaitingCount(nextWaitingCount);
      onStatusChange?.({ entry: nextEntry, waitingCount: nextWaitingCount });
      setNotice("You left the matching pool for this activity.");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Matchmaking couldn’t be paused.");
    } finally {
      setBusy(null);
    }
  }

  async function createFriendGroup() {
    if (!selected.length) return;
    setBusy("friends");
    setError("");
    try {
      const groupId = await createActivityGroup(activity.id, selected, viewer);
      router.push(`/group?id=${groupId}`);
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "We couldn’t create this group.");
      setBusy(null);
    }
  }

  const waiting = matchEntry?.status === "waiting";
  const matchedGroupId = matchEntry?.status === "matched" ? matchEntry.group_id : null;
  const preference = MATCHMAKING_PRESETS[preferenceIndex];

  return (
    <>
      {matchedGroupId
        ? <Link className={`${styles.activityAction} ${styles.activityActionDark}`} href={`/group?id=${matchedGroupId}`}><UsersRound size={16} />View match</Link>
        : <button className={`${styles.activityAction} ${styles.activityActionDark}`} type="button" onClick={() => setOpen(true)}><UsersRound size={16} />{waiting ? "Review match" : "Find company"}</button>}
      {open && (
        <div className={styles.sheetLayer}>
          <button className={styles.sheetScrim} type="button" aria-label="Close find company" onClick={() => setOpen(false)} />
          <section className={`${styles.companySheet} ${styles.matchmakingSheet}`} role="dialog" aria-modal="true" aria-labelledby="company-sheet-title">
            <div className={styles.sheetHandle} />
            <header className={styles.sheetHeader}><div><p>{activity.title}</p><h2 id="company-sheet-title">Find your group</h2></div><button className={styles.sheetClose} type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button></header>
            <section className={styles.matchmakerCard}>
              <div className={styles.matchmakerHeading}><span><Sparkles size={16} /></span><div><small>Powered by Meta AI</small><h3>Let Muse make the group</h3></div></div>
              <p>Choose a comfortable size. Muse uses shared interests and profile introductions to choose a friendly fit once enough people join.</p>
              <div className={styles.groupSizeOptions} aria-label="Preferred group size">
                {MATCHMAKING_PRESETS.map((preset, index) => <button className={preferenceIndex === index ? styles.groupSizeSelected : ""} type="button" aria-pressed={preferenceIndex === index} disabled={busy !== null} key={preset.label} onClick={() => setPreferenceIndex(index)}><strong>{preset.label}</strong><span>{preset.detail}</span></button>)}
              </div>
              {waiting ? <div className={styles.matchWaiting}><Clock3 size={15} /><span><strong>Matching is active</strong><small>{waitingCount} {waitingCount === 1 ? "person" : "people"} currently in this activity’s pool</small></span></div> : null}
              <button className={styles.matchButton} type="button" disabled={busy !== null || loading} onClick={() => void joinMatchmaking()}><Sparkles size={16} />{busy === "matching" ? "Muse is checking…" : waiting ? `Update to ${preference.detail}` : "Join matchmaking"}</button>
              {waiting ? <button className={styles.leaveMatchButton} type="button" disabled={busy !== null} onClick={() => void leaveMatchmaking()}>{busy === "cancel" ? "Leaving…" : "Leave matching pool"}</button> : null}
            </section>
            <div className={styles.matchDivider}><span>or make a group with friends</span></div>
            <div className={styles.friendPickerHeading}><div><h3>Invite Friends</h3><p>Only people you’ve added as Friends appear here.</p></div><Link href="/friends">View Friends</Link></div>
            {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
            {notice ? <p className={styles.matchNotice} role="status">{notice}</p> : null}
            <div className={styles.peopleList}>
              {loading ? <p className={styles.peopleEmpty}>Loading your Friends…</p> : null}
              {!loading && viewer.kind === "demo" ? <p className={styles.peopleEmpty}>Friends and live invitations are available to real accounts.</p> : null}
              {!loading && viewer.kind === "anonymous" ? <p className={styles.peopleEmpty}>Log in before creating a group.</p> : null}
              {!loading && viewer.kind === "real" && !friends.length ? <div className={styles.peopleEmpty}><p>No Friends yet. People you add after meeting through Dyad will appear here.</p><Link href="/friends">Open Friends</Link></div> : null}
              {friends.map((person) => <div className={styles.personOption} key={person.id}>
                <Link className={styles.personProfileLink} href={`/profile?person=${person.id}`} aria-label={`View ${person.display_name}'s profile`}><span className={`${styles.personAvatar} ${styles.avatar_aqua}`}><UserRound size={20} /></span><span className={styles.personCopy}><span className={styles.personNameLine}><strong className={styles.personName}>{person.display_name || "Dyad member"}</strong><span className={styles.attendanceBadge}>{person.attended_count} attended</span></span>{person.one_liner ? <span className={styles.personIntro}>“{person.one_liner}”</span> : null}</span></Link>
                <label className={styles.checkboxLabel}><input type="checkbox" aria-label={`Invite ${person.display_name || "this friend"}`} checked={selected.includes(person.id)} onChange={() => setSelected((current) => toggleInviteSelection(current, person.id))} /><span className={styles.checkboxMark}><Check size={14} /></span></label>
              </div>)}
            </div>
            <footer className={styles.sheetFooter}><button className={styles.createGroupButton} type="button" disabled={!selected.length || busy !== null} onClick={() => void createFriendGroup()}><Plus size={17} />{busy === "friends" ? "Creating group…" : selected.length ? `Invite ${selected.length} ${selected.length === 1 ? "Friend" : "Friends"}` : "Choose Friends instead"}</button></footer>
          </section>
        </div>
      )}
    </>
  );
}
