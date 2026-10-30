"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, Compass, MailOpen, X } from "lucide-react";
import styles from "../dyad.module.css";
import { AppHeader, BottomNavigation } from "../app-navigation";
import { resolveViewer } from "@/lib/activity-data";
import { listInboxNotifications, type InboxNotification } from "@/lib/group-data";

export default function InboxPage() {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setNotifications(await listInboxNotifications(await resolveViewer())); }
    catch { setError("Your inbox couldn’t be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <AppHeader />
        <div className={`${styles.feedScroll} ${styles.inboxScroll}`}>
          <h1>Inbox</h1>
          <p className={styles.inboxIntro}>Invitations and updates about your plans live here.</p>
          {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
          {loading ? <section className={styles.emptyState}><h2>Loading inbox…</h2></section> : notifications.length ? (
            <section className={styles.chatList} aria-label="Notifications">
              {notifications.map((notification) => {
                const accepted = notification.title.endsWith("accepted");
                const declined = notification.title.endsWith("declined");
                return <Link className={styles.chatListRow} href={`/group?id=${notification.groupId}`} key={notification.id}>
                  <span className={`${styles.chatListAvatar} ${styles.inboxNotificationIcon}`}>
                    {notification.kind === "group_invite" ? <MailOpen size={19} /> : accepted ? <Check size={19} /> : declined ? <X size={19} /> : <Bell size={19} />}
                  </span>
                  <span className={styles.chatListCopy}><strong>{notification.title}</strong><span>{notification.body}</span></span>
                  <span className={styles.chatListMeta}><time>{relativeTime(notification.createdAt)}</time>{notification.unread ? <span>New</span> : null}</span>
                </Link>;
              })}
            </section>
          ) : (
            <section className={styles.emptyState}>
              <span className={styles.emptyStateIcon}><Bell size={22} /></span>
              <h2>You’re all caught up</h2>
              <p>New group invitations and plan updates will appear here.</p>
              <Link href="/feed"><Compass size={15} />Explore Discovery</Link>
            </section>
          )}
        </div>
        <BottomNavigation active="you" />
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
