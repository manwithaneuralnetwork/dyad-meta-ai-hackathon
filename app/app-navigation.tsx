"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Compass, MessageCircle, UserRound } from "lucide-react";
import styles from "./dyad.module.css";
import { getAppMode } from "@/lib/app-session";
import { getViewerProfile, resolveViewer } from "@/lib/activity-data";

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
  return (
    <nav className={styles.bottomNav} aria-label="Primary navigation">
      <Link className={`${styles.navItem} ${active === "feed" ? styles.navActive : ""}`} href="/feed"><Compass size={20} /><span>Discovery</span></Link>
      <Link className={`${styles.navItem} ${active === "activities" ? styles.navActive : ""}`} href="/activities"><CalendarDays size={20} /><span>My Activities</span></Link>
      <Link className={`${styles.navItem} ${active === "chats" ? styles.navActive : ""}`} href="/chats"><MessageCircle size={20} /><span>Chats</span></Link>
      <Link className={`${styles.navItem} ${active === "you" ? styles.navActive : ""}`} href="/you"><UserRound size={20} /><span>You</span></Link>
    </nav>
  );
}
