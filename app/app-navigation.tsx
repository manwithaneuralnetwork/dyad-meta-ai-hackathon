"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Compass, MessageCircle, UserRound } from "lucide-react";
import styles from "./dyad.module.css";
import { getAppMode } from "@/lib/app-session";
import { getViewerProfile, resolveViewer } from "@/lib/activity-data";
import { getNotificationCounts, subscribeToNotificationChanges, unsubscribeFromGroup } from "@/lib/group-data";

export function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export function AppHeader() {
  const [viewerName, setViewerName] = useState("");

  useEffect(() => {
    void (async () => {
      if (getAppMode() === "demo") {
        setViewerName("Demo");
        return;
      }
      const viewer = await resolveViewer();
      const profile = await getViewerProfile(viewer);
      setViewerName(profile?.display_name || "You");
    })();
  }, []);

  return (
    <header className={styles.feedHeader}>
      <Logo />
      <Link className={styles.profileSummary} href="/you" aria-label="Open your profile"><span>{viewerName}</span><span className={styles.profileBadge}><UserRound size={17} /></span></Link>
    </header>
  );
}

export function BottomNavigation({ active }: { active: "feed" | "activities" | "chats" | "you" }) {
  const [counts, setCounts] = useState({ chats: 0, inbox: 0 });

  useEffect(() => {
    let activeEffect = true;
    const refresh = async () => {
      try {
        const next = await getNotificationCounts(await resolveViewer());
        if (activeEffect) setCounts(next);
      } catch {
        // Navigation stays usable if notification counts are temporarily unavailable.
      }
    };
    const handleChange = () => { void refresh(); };
    void refresh();
    window.addEventListener("dyad:notifications-changed", handleChange);
    const channel = subscribeToNotificationChanges(handleChange);
    return () => {
      activeEffect = false;
      window.removeEventListener("dyad:notifications-changed", handleChange);
      unsubscribeFromGroup(channel);
    };
  }, []);

  return (
    <nav className={styles.bottomNav} aria-label="Primary navigation">
      <Link className={`${styles.navItem} ${active === "feed" ? styles.navActive : ""}`} href="/feed"><Compass size={20} /><span>Discovery</span></Link>
      <Link className={`${styles.navItem} ${active === "activities" ? styles.navActive : ""}`} href="/activities"><CalendarDays size={20} /><span>My Activities</span></Link>
      <Link className={`${styles.navItem} ${active === "chats" ? styles.navActive : ""}`} href="/chats"><span className={styles.navIconWrap}><MessageCircle size={20} />{counts.chats > 0 ? <span className={styles.navBadge}>{counts.chats > 9 ? "9+" : counts.chats}</span> : null}</span><span>Chats</span></Link>
      <Link className={`${styles.navItem} ${active === "you" ? styles.navActive : ""}`} href="/you"><span className={styles.navIconWrap}><UserRound size={20} />{counts.inbox > 0 ? <span className={styles.navBadge}>{counts.inbox > 9 ? "9+" : counts.inbox}</span> : null}</span><span>You</span></Link>
    </nav>
  );
}
