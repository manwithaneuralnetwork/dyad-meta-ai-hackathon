"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Compass, MessageCircle, Search } from "lucide-react";
import styles from "../dyad.module.css";
import { AppHeader, BottomNavigation } from "../app-navigation";
import {
  activityLocation,
  formatActivityDate,
  listActivities,
  loadActivityStates,
  resolveViewer,
  type ActivityRecord,
  type ActivityUiState,
} from "@/lib/activity-data";
import { listMyGroups, type GroupSummary } from "@/lib/group-data";

type ActivityKind = "group" | "interested" | "saved" | "past";

function ActivityRow({ activity, kind, groupId }: { activity: ActivityRecord; kind: ActivityKind; groupId?: string }) {
  return (
    <Link className={`${styles.myActivityRow} ${kind === "past" ? styles.myActivityPast : ""}`} href={kind === "group" && groupId ? `/group?id=${groupId}` : `/activity?id=${activity.id}`}>
      <span className={`${styles.myActivityArt} ${!activity.image_url ? styles.jazz : ""}`} aria-hidden="true">{activity.image_url ? <img src={activity.image_url} alt="" /> : null}</span>
      <span className={styles.myActivityCopy}>
        <span className={styles.myActivityMeta}>{kind === "group" ? <MessageCircle size={11} /> : null}{kind === "past" ? `Passed · ${formatActivityDate(activity.starts_at)}` : formatActivityDate(activity.starts_at)}</span>
        <strong>{activity.title}</strong>
        <span className={styles.myActivityDetail}>{activityLocation(activity) || activity.city}</span>
      </span>
      <ChevronRight className={styles.myActivityChevron} size={18} aria-hidden="true" />
    </Link>
  );
}

function ActivitySection({ title, items, kind, emptyText, groups = [] }: { title: string; items: ActivityRecord[]; kind: ActivityKind; emptyText: string; groups?: GroupSummary[] }) {
  return (
    <section className={styles.myActivitySection}>
      <div className={styles.myActivitySectionHeading}><h2>{title}</h2><span>{items.length}</span></div>
      {items.length ? <div className={styles.myActivityList}>{items.map((item) => <ActivityRow activity={item} kind={kind} groupId={groups.find((group) => group.activity.id === item.id)?.groupId} key={item.id} />)}</div> : (
        <div className={styles.sectionEmptyState}><p>{emptyText}</p><Link href="/feed"><Compass size={13} />Go to Discovery</Link></div>
      )}
    </section>
  );
}

export default function MyActivitiesPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [states, setStates] = useState<Record<string, ActivityUiState>>({});
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catalog, viewer] = await Promise.all([listActivities({ includePast: true }), resolveViewer()]);
      const [activityStates, myGroups] = await Promise.all([loadActivityStates(catalog.map((activity) => activity.id), viewer), listMyGroups(viewer)]);
      setActivities(catalog);
      setStates(activityStates);
      setGroups(myGroups.filter((group) => group.status === "member"));
    } catch {
      setError("Your activities couldn’t be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lists = useMemo(() => {
    const now = Date.now();
    const matches = (activity: ActivityRecord) => !query.trim() || `${activity.title} ${activity.venue_name} ${activity.address} ${activity.city}`.toLowerCase().includes(query.trim().toLowerCase());
    const tracked = activities.filter((activity) => {
      const state = states[activity.id];
      return state && (state.interested || state.saved) && matches(activity);
    });
    return {
      interested: tracked.filter((activity) => new Date(activity.starts_at).getTime() >= now && states[activity.id]?.interested).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
      saved: tracked.filter((activity) => new Date(activity.starts_at).getTime() >= now && states[activity.id]?.saved).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
      past: tracked.filter((activity) => new Date(activity.starts_at).getTime() < now).sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at)),
    };
  }, [activities, query, states]);

  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <AppHeader />
        <div className={`${styles.feedScroll} ${styles.myActivitiesScroll}`}>
          <h1>My Activities</h1>
          <label className={styles.activitiesSearch}><Search size={17} aria-hidden="true" /><input type="search" placeholder="Search your activities" aria-label="Search your activities" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
          {loading ? <div className={styles.sectionEmptyState}><p>Loading your activities…</p></div> : (
            <>
              <ActivitySection title="Your groups" items={groups.map((group) => group.activity)} groups={groups} kind="group" emptyText="No activity groups yet. Find company on an activity to start one." />
              <ActivitySection title="Interested" items={lists.interested} kind="interested" emptyText={query ? "No interested activities match your search." : "You haven’t marked any upcoming activities as interested."} />
              <ActivitySection title="Saved" items={lists.saved} kind="saved" emptyText={query ? "No saved activities match your search." : "Save an activity to keep it handy without making yourself visible."} />
              <ActivitySection title="Past" items={lists.past} kind="past" emptyText={query ? "No past activities match your search." : "Past activities you tracked will appear here."} />
            </>
          )}
        </div>
        <BottomNavigation active="activities" />
      </div>
    </main>
  );
}
