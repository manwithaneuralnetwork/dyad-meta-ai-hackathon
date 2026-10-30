"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Compass, MessageCircle } from "lucide-react";
import styles from "../dyad.module.css";
import { AppHeader, BottomNavigation } from "../app-navigation";
import { resolveViewer } from "@/lib/activity-data";
import { listMyGroups, type GroupSummary } from "@/lib/group-data";

export default function ChatsPage() {
  const [tab, setTab] = useState<"all" | "activities">("all");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setGroups(await listMyGroups(await resolveViewer())); }
    catch { setError("Your conversations couldn’t be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <AppHeader />
        <div className={`${styles.feedScroll} ${styles.chatsScroll}`}>
          <h1>Chats</h1>
          <div className={styles.chatTabs} role="tablist" aria-label="Chat filters">
            <button className={tab === "all" ? styles.chatTabActive : ""} type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>All</button>
            <button className={tab === "activities" ? styles.chatTabActive : ""} type="button" role="tab" aria-selected={tab === "activities"} onClick={() => setTab("activities")}>Activities</button>
          </div>
          {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
          {loading ? <section className={styles.emptyState}><h2>Loading conversations…</h2></section> : groups.length ? (
            <section className={styles.chatList} aria-label="Conversations">
              {groups.map((group) => <Link className={styles.chatListRow} href={`/group?id=${group.groupId}`} key={group.groupId}>
                <span className={`${styles.chatListAvatar} ${styles.chatListActivity}`}>{group.activity.image_url ? <img src={group.activity.image_url} alt="" /> : null}</span>
                <span className={styles.chatListCopy}><strong>{group.activity.title}</strong><span>{group.status === "pending" ? "Invitation · " : ""}{group.lastMessage}</span></span>
                <span className={styles.chatListMeta}><time>{relativeTime(group.lastActivityAt)}</time>{group.status === "pending" ? <span>New</span> : null}</span>
              </Link>)}
            </section>
          ) : (
            <section className={styles.emptyState}>
              <span className={styles.emptyStateIcon}><MessageCircle size={22} /></span>
              <h2>{tab === "activities" ? "No activity chats yet" : "No conversations yet"}</h2>
              <p>{tab === "activities" ? "Activity groups you create or join will appear here." : "Find an activity and invite some company to start a conversation."}</p>
              <Link href="/feed"><Compass size={15} />Explore Discovery</Link>
            </section>
          )}
        </div>
        <BottomNavigation active="chats" />
      </div>
    </main>
  );
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}
