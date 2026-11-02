"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MapPin, RefreshCw, UsersRound } from "lucide-react";
import styles from "../dyad.module.css";
import EventMenu from "./event-menu";
import { AppHeader, BottomNavigation } from "../app-navigation";
import {
  activityLocation,
  formatActivityDate,
  listActivities,
  loadViewerInterests,
  loadActivityStates,
  resolveViewer,
  saveActivityState,
  type ActivityRecord,
  type ActivityUiState,
  type Viewer,
} from "@/lib/activity-data";

function EventArtwork({ activity }: { activity: ActivityRecord }) {
  return activity.image_url ? (
    <span className={styles.eventArtwork}><img className={styles.eventArtworkImage} src={activity.image_url} alt="" /></span>
  ) : <span className={`${styles.eventArtwork} ${styles.jazz}`} aria-hidden="true" />;
}

function EventRow({
  activity,
  state,
  busy,
  onChange,
  onFindCompany,
}: {
  activity: ActivityRecord;
  state: ActivityUiState;
  busy: boolean;
  onChange: (next: ActivityUiState) => void;
  onFindCompany: () => void;
}) {
  const href = `/activity?id=${activity.id}`;
  return (
    <article className={styles.eventRow}>
      <Link className={styles.eventArtworkLink} href={href} aria-label={`Open ${activity.title}`}><EventArtwork activity={activity} /></Link>
      <div className={styles.eventDetails}>
        <EventMenu href={href} title={activity.title} />
        <p className={styles.eventDate}>{formatActivityDate(activity.starts_at)}</p>
        <h2><Link href={href}>{activity.title}</Link></h2>
        <p className={styles.eventAddress}><MapPin size={13} aria-hidden="true" />{activityLocation(activity) || activity.city}</p>
        <div className={styles.eventActions}>
          {state.groupId ? <>
            <button className={styles.actionPill} type="button" disabled><Heart size={12} aria-hidden="true" />In group</button>
            <Link className={styles.actionPill} href={`/group?id=${state.groupId}`}><UsersRound size={12} aria-hidden="true" />Open group</Link>
          </> : <>
            <button className={`${styles.actionPill} ${state.interested ? styles.actionSelected : ""}`} type="button" disabled={busy} onClick={() => { const interested = !state.interested; onChange({ ...state, interested, discoverable: false }); }}><Heart size={12} fill={state.interested ? "currentColor" : "none"} aria-hidden="true" />Interested</button>
            <button className={styles.actionPill} type="button" disabled={busy} onClick={onFindCompany}><UsersRound size={12} aria-hidden="true" />Find company</button>
          </>}
        </div>
      </div>
    </article>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [states, setStates] = useState<Record<string, ActivityUiState>>({});
  const [viewer, setViewer] = useState<Viewer>({ kind: "anonymous" });
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextActivities, nextViewer] = await Promise.all([listActivities(), resolveViewer()]);
      const [nextStates, nextInterests] = await Promise.all([
        loadActivityStates(nextActivities.map((activity) => activity.id), nextViewer),
        loadViewerInterests(nextViewer),
      ]);
      setActivities(nextActivities);
      setViewer(nextViewer);
      setStates(nextStates);
      setFilterTags(nextInterests);
    } catch {
      setError("Discovery couldn’t load right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredActivities = useMemo(() => {
    if (!selectedFilters.length) return activities;
    const selected = new Set(selectedFilters.map((tag) => tag.toLowerCase()));
    return activities.filter((activity) => activity.topics.some((topic) => selected.has(topic.toLowerCase())));
  }, [activities, selectedFilters]);

  function toggleFilter(tag: string) {
    setSelectedFilters((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  async function updateState(activityId: string, next: ActivityUiState, openCompany = false) {
    const previous = states[activityId] ?? { interested: false, saved: false, discoverable: false };
    setError("");
    setBusyId(activityId);
    setStates((current) => ({ ...current, [activityId]: next }));
    try {
      const saved = await saveActivityState(activityId, next, viewer);
      setStates((current) => ({ ...current, [activityId]: saved }));
      if (openCompany) router.push(`/activity?id=${activityId}&company=1`);
    } catch (stateError) {
      setStates((current) => ({ ...current, [activityId]: previous }));
      setError(stateError instanceof Error ? stateError.message : "That change couldn’t be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <AppHeader />
        <div className={styles.feedScroll}>
          <h1>Discover</h1>
          {!loading && filterTags.length ? (
            <div className={styles.discoveryFilters} aria-label="Filter activities by your interests">
              <button className={!selectedFilters.length ? styles.discoveryFilterActive : ""} type="button" onClick={() => setSelectedFilters([])}>All</button>
              {filterTags.map((tag) => <button className={selectedFilters.includes(tag) ? styles.discoveryFilterActive : ""} key={tag} type="button" aria-pressed={selectedFilters.includes(tag)} onClick={() => toggleFilter(tag)}>{tag}</button>)}
            </div>
          ) : null}
          {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
          {loading ? (
            <div className={styles.emptyState}><span className={styles.emptyStateIcon}><RefreshCw size={20} /></span><h2>Finding things to do…</h2></div>
          ) : filteredActivities.length ? (
            <section className={styles.eventList} aria-label="Nearby activities">
              {filteredActivities.map((activity) => {
                const state = states[activity.id] ?? { interested: false, saved: false, discoverable: false };
                return <EventRow activity={activity} state={state} busy={busyId === activity.id} key={activity.id} onChange={(next) => void updateState(activity.id, next)} onFindCompany={() => router.push(`/activity?id=${activity.id}&company=1`)} />;
              })}
            </section>
          ) : activities.length && selectedFilters.length ? (
            <section className={styles.emptyState}>
              <span className={styles.emptyStateIcon}><RefreshCw size={20} /></span>
              <h2>No matches for those interests</h2>
              <p>Try another tag or return to everything happening nearby.</p>
              <button className={styles.emptyStateAction} type="button" onClick={() => setSelectedFilters([])}>Show all activities</button>
            </section>
          ) : (
            <section className={styles.emptyState}>
              <span className={styles.emptyStateIcon}><RefreshCw size={20} /></span>
              <h2>No activities nearby yet</h2>
              <p>New official listings will show up here as soon as the catalog refreshes.</p>
              <button className={styles.emptyStateAction} type="button" onClick={() => void load()}>Check again</button>
            </section>
          )}
        </div>
        <BottomNavigation active="feed" />
      </div>
    </main>
  );
}
