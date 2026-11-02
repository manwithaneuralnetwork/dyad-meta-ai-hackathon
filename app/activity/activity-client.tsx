"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3, Heart, MapPin, RefreshCw, Sparkles, Ticket, UsersRound } from "lucide-react";
import styles from "../dyad.module.css";
import FindCompanySheet from "./find-company-sheet";
import SmartBackButton from "../smart-back-button";
import {
  activityLocation,
  formatActivityDate,
  getActivity,
  loadActivityStates,
  resolveViewer,
  saveActivityState,
  type ActivityRecord,
  type ActivityUiState,
  type Viewer,
} from "@/lib/activity-data";
import type { ActivityMatchmakingStatus } from "@/lib/activity-matchmaking";

const emptyUiState: ActivityUiState = { interested: false, saved: false, discoverable: false };

export default function ActivityClient({ activityId, openCompanyInitially }: { activityId: string; openCompanyInitially: boolean }) {
  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [state, setState] = useState<ActivityUiState>(emptyUiState);
  const [viewer, setViewer] = useState<Viewer>({ kind: "anonymous" });
  const [loading, setLoading] = useState(Boolean(activityId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [matchStatus, setMatchStatus] = useState<ActivityMatchmakingStatus | null>(null);
  const [sheetOpenSignal, setSheetOpenSignal] = useState(0);

  const load = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    setError("");
    try {
      const [nextActivity, nextViewer] = await Promise.all([getActivity(activityId), resolveViewer()]);
      if (!nextActivity) {
        setActivity(null);
        return;
      }
      const nextStates = await loadActivityStates([activityId], nextViewer);
      setActivity(nextActivity);
      setViewer(nextViewer);
      setState(nextStates[activityId] ?? emptyUiState);
    } catch {
      setError("This activity couldn’t be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (viewer.kind !== "real" || !activityId || state.groupId) {
      setMatchStatus(null);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/activities/${activityId}/matchmaking`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as ActivityMatchmakingStatus;
        if (active) setMatchStatus(payload);
      } catch {
        // The activity page stays usable if a background status refresh fails.
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [activityId, state.groupId, viewer]);

  async function persist(next: ActivityUiState) {
    const previous = state;
    setBusy(true);
    setError("");
    setState(next);
    try {
      const saved = await saveActivityState(activityId, next, viewer);
      setState(saved);
      return true;
    } catch (stateError) {
      setState(previous);
      setError(stateError instanceof Error ? stateError.message : "That change couldn’t be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ActivityEmpty title="Loading activity…" detail="We’re getting the latest details." loading />;
  if (!activityId || (!activity && !error)) return <ActivityEmpty title="Choose an activity first" detail="Open an activity from Discovery to see its details." />;
  if (!activity) return <ActivityEmpty title="Activity not found" detail={error || "This activity may no longer be available."} />;

  const facts = [
    { label: "When", value: formatActivityDate(activity.starts_at, { long: true }), Icon: CalendarDays },
    { label: "Where", value: activityLocation(activity) || activity.city, Icon: MapPin },
    { label: "Finding company", value: "Muse can match a group around your preferences", Icon: UsersRound },
    { label: "Tickets", value: activity.price_label || "See organizer", Icon: Ticket },
  ];
  const isTicketmaster = activity.source_name.trim().toLowerCase() === "ticketmaster";

  async function toggleInterested() {
    const interested = !state.interested;
    await persist({ ...state, interested, discoverable: false });
  }

  return (
    <main className={styles.pageBackdrop}>
      <article className={`${styles.mobilePage} ${styles.activityPage}`}>
        <div className={`${styles.activityHero} ${activity.image_url ? styles.activityHeroWithImage : ""}`} aria-label={activity.image_url ? `Image for ${activity.title}` : `Artwork for ${activity.title}`}>
          {activity.image_url ? <img className={styles.activityHeroImage} src={activity.image_url} alt="" /> : null}
          <div className={styles.activityTopbar}>
            <SmartBackButton className={`${styles.heroIcon} ${styles.heroBack}`} fallbackHref="/feed" label="Go back" size={22} />
          </div>
        </div>

        <div className={styles.activityBody}>
          <p className={styles.activityDate}>{formatActivityDate(activity.starts_at)}</p>
          <h1 className={styles.activityHeading}>{activity.title}</h1>
          {activity.topics.length ? <div className={styles.tagList} aria-label="Activity topics">{activity.topics.map((topic) => <span className={styles.tag} key={topic}>{topic}</span>)}</div> : null}

          <div className={`${styles.activityActions} ${state.interested ? styles.activityActionsWithNotice : ""}`}>
            {state.groupId ? <>
              <button className={styles.activityAction} type="button" disabled><Heart size={16} />In group</button>
              <Link className={`${styles.activityAction} ${styles.activityActionDark}`} href={`/group?id=${state.groupId}`}><UsersRound size={16} />Open group</Link>
            </> : <>
              <button className={`${styles.activityAction} ${state.interested ? styles.actionSelected : ""}`} type="button" disabled={busy} onClick={() => void toggleInterested()}><Heart size={16} fill={state.interested ? "currentColor" : "none"} />Interested</button>
              <FindCompanySheet activity={activity} viewer={viewer} initiallyOpen={openCompanyInitially} openSignal={sheetOpenSignal} status={matchStatus} onStatusChange={setMatchStatus} />
            </>}
          </div>
          {state.groupId ? <p className={styles.interestNotice} role="status">You’re already in this activity’s group.</p> : state.interested ? <p className={styles.interestNotice} role="status">Added to Interested in My Activities.</p> : null}
          {error ? <p className={styles.pageError} role="alert">{error}</p> : null}

          {matchStatus?.entry && ["waiting", "matched"].includes(matchStatus.entry.status) && !state.groupId ? (
            <section className={`${styles.matchProgressCard} ${matchStatus.entry.status === "matched" ? styles.matchProgressReady : ""}`} aria-live="polite">
              <div className={styles.matchProgressHeader}>
                <span className={styles.matchProgressOrb}><Sparkles size={17} /></span>
                <div><p>Muse matchmaking</p><h2>{matchStatus.entry.status === "matched" ? "Your match is ready" : "Finding your group"}</h2></div>
                <span className={styles.matchProgressLive}><span />{matchStatus.entry.status === "matched" ? "Ready" : "Live"}</span>
              </div>
              <p className={styles.matchProgressCopy}>{matchStatus.entry.status === "matched" ? "Muse found a compatible group. Open the invitation to meet them and decide whether to join." : "Muse is watching for compatible group sizes, then comparing shared interests before invitations go out."}</p>
              <div className={styles.matchProgressSteps}>
                <span className={styles.matchStepDone}><Check size={11} />You’re in</span>
                <span className={matchStatus.entry.status === "matched" ? styles.matchStepDone : styles.matchStepActive}>{matchStatus.entry.status === "matched" ? <Check size={11} /> : <span className={styles.matchStepPulse} />}Fit compared</span>
                <span className={matchStatus.entry.status === "matched" ? styles.matchStepDone : ""}>{matchStatus.entry.status === "matched" ? <Check size={11} /> : <Clock3 size={11} />}Invitation</span>
              </div>
              <div className={styles.matchProgressFooter}>
                <span><strong>{matchStatus.entry.min_group_size === matchStatus.entry.max_group_size ? matchStatus.entry.min_group_size : `${matchStatus.entry.min_group_size}–${matchStatus.entry.max_group_size}`}</strong> preferred group size</span>
                {matchStatus.entry.status === "waiting" ? <span><strong>{matchStatus.waitingCount}</strong> {matchStatus.waitingCount === 1 ? "person" : "people"} in the pool</span> : <span><strong>1</strong> invitation ready</span>}
                {matchStatus.entry.status === "matched" && matchStatus.entry.group_id
                  ? <Link href={`/group?id=${matchStatus.entry.group_id}`}>Open invitation</Link>
                  : <button type="button" onClick={() => setSheetOpenSignal((value) => value + 1)}>Review preferences</button>}
              </div>
            </section>
          ) : null}

          <dl className={styles.activityFacts}>{facts.map(({ label, value, Icon }) => <div className={styles.activityFact} key={label}><span className={styles.factIcon}><Icon size={17} aria-hidden="true" /></span><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>

          {activity.description ? <section className={styles.activitySection}><h2>About this activity</h2><p>{activity.description}</p></section> : null}
          <section className={styles.activitySection}><h2>Hosted by</h2><div className={styles.hostCard}>{isTicketmaster ? <img className={styles.hostLogo} src="/ticketmaster-logo.png" alt="Ticketmaster logo" /> : <span className={styles.hostMark}>{activity.source_name.slice(0, 2).toUpperCase()}</span>}<div><strong>{activity.source_name}</strong>{activity.source_url ? <a className={styles.hostLink} href={activity.source_url} target="_blank" rel="noreferrer">View official listing <ArrowRight size={13} aria-hidden="true" /></a> : <span>{activity.source_type === "official" ? "Official activity" : "Community activity"}</span>}</div></div></section>
        </div>
      </article>
    </main>
  );
}

function ActivityEmpty({ title, detail, loading = false }: { title: string; detail: string; loading?: boolean }) {
  return (
    <main className={styles.pageBackdrop}>
      <article className={`${styles.mobilePage} ${styles.activityPage}`}>
        <header className={styles.emptyPageHeader}><SmartBackButton className={styles.plainBackButton} fallbackHref="/feed" /></header>
        <section className={`${styles.emptyState} ${styles.activityEmptyState}`}>
          <span className={styles.emptyStateIcon}>{loading ? <RefreshCw size={20} /> : <CalendarDays size={20} />}</span>
          <h1>{title}</h1><p>{detail}</p>
          {!loading ? <Link className={styles.emptyStateAction} href="/feed">Go to Discovery</Link> : null}
        </section>
      </article>
    </main>
  );
}
