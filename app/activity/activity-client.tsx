"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, CalendarDays, Heart, MapPin, RefreshCw, Ticket, UsersRound } from "lucide-react";
import styles from "../dyad.module.css";
import FindCompanySheet from "./find-company-sheet";
import SmartBackButton from "../smart-back-button";
import {
  activityLocation,
  countDiscoverablePeople,
  formatActivityDate,
  getActivity,
  loadActivityStates,
  resolveViewer,
  saveActivityState,
  type ActivityRecord,
  type ActivityUiState,
  type Viewer,
} from "@/lib/activity-data";

const emptyUiState: ActivityUiState = { interested: false, saved: false, discoverable: false };

export default function ActivityClient({ activityId, openCompanyInitially }: { activityId: string; openCompanyInitially: boolean }) {
  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [state, setState] = useState<ActivityUiState>(emptyUiState);
  const [viewer, setViewer] = useState<Viewer>({ kind: "anonymous" });
  const [peopleCount, setPeopleCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(Boolean(activityId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      const [nextStates, nextCount] = await Promise.all([
        loadActivityStates([activityId], nextViewer),
        countDiscoverablePeople(activityId, nextViewer),
      ]);
      setActivity(nextActivity);
      setViewer(nextViewer);
      setState(nextStates[activityId] ?? emptyUiState);
      setPeopleCount(nextCount);
    } catch {
      setError("This activity couldn’t be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => { void load(); }, [load]);

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
    { label: "Looking for company", value: peopleCount === null ? "Available to real accounts" : `${peopleCount} ${peopleCount === 1 ? "person is" : "people are"} visible`, Icon: UsersRound },
    { label: "Tickets", value: activity.price_label || "See organizer", Icon: Ticket },
  ];
  const isTicketmaster = activity.source_name.trim().toLowerCase() === "ticketmaster";

  async function toggleInterested() {
    const interested = !state.interested;
    await persist({ ...state, interested, discoverable: interested });
  }

  return (
    <main className={styles.pageBackdrop}>
      <article className={`${styles.mobilePage} ${styles.activityPage}`}>
        <div className={`${styles.activityHero} ${activity.image_url ? styles.activityHeroWithImage : ""}`} aria-label={activity.image_url ? `Image for ${activity.title}` : `Artwork for ${activity.title}`}>
          {activity.image_url ? <img className={styles.activityHeroImage} src={activity.image_url} alt="" /> : null}
          <div className={styles.activityTopbar}>
            <SmartBackButton className={`${styles.heroIcon} ${styles.heroBack}`} fallbackHref="/feed" label="Go back" size={22} />
            <button className={`${styles.heroIcon} ${state.saved ? styles.saveSelected : ""}`} type="button" disabled={busy} aria-label={`${state.saved ? "Unsave" : "Save"} ${activity.title}`} onClick={() => void persist({ ...state, saved: !state.saved })}><Bookmark size={18} fill={state.saved ? "currentColor" : "none"} /></button>
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
              <FindCompanySheet activity={activity} viewer={viewer} initiallyOpen={openCompanyInitially} onActivate={() => persist({ ...state, interested: true, discoverable: true })} />
            </>}
          </div>
          {state.groupId ? <p className={styles.interestNotice} role="status">You’re already in this activity’s group.</p> : state.interested ? <p className={styles.interestNotice} role="status">You’re open to invitations from other Interested people.</p> : null}
          {error ? <p className={styles.pageError} role="alert">{error}</p> : null}

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
