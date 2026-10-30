import Link from "next/link";
import { CalendarDays, Compass, MessageCircle, UserRound } from "lucide-react";
import styles from "./dyad.module.css";

export function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export function AppHeader() {
  return (
    <header className={styles.feedHeader}>
      <Link href="/" aria-label="Back to Dyad home"><Logo /></Link>
      <Link className={styles.profileBadge} href="/you" aria-label="Open your profile"><UserRound size={17} /></Link>
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
