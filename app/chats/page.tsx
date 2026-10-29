"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Compass, MessageCircle, UserRound } from "lucide-react";
import styles from "../dyad.module.css";

const chats = [
  { title: "Jazz in the Courtyard", preview: "Maya: I’ll drop one here before we head over.", time: "10:53 AM", activity: true, art: "jazz", href: "/group", unread: 2 },
  { title: "Maya Chen", preview: "That sounds perfect—see you there.", time: "9:42 AM", activity: false, initials: "MC", href: "/group?dm=maya", unread: 0 },
  { title: "Friday Night Crew", preview: "Eli: Anyone free next weekend?", time: "Yesterday", activity: false, initials: "4", href: "/group", unread: 1 },
  { title: "Beginner Woodworking Workshop", preview: "Eli: I can bring an extra pair of gloves.", time: "Tue", activity: true, art: "workshop", href: "/group", unread: 0 },
  { title: "Sofia Martin", preview: "Send me that coffee place when you find it!", time: "Mon", activity: false, initials: "SM", href: "/group?dm=sofia", unread: 0 },
] as const;

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function ChatsPage() {
  const [tab, setTab] = useState<"all" | "activities">("all");
  const visibleChats = tab === "all" ? chats : chats.filter((chat) => chat.activity);

  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <header className={styles.feedHeader}>
          <Link href="/" aria-label="Back to Dyad home"><Logo /></Link>
          <span className={styles.profileBadge}>SL</span>
        </header>
        <div className={`${styles.feedScroll} ${styles.chatsScroll}`}>
          <h1>Chats</h1>
          <div className={styles.chatTabs} role="tablist" aria-label="Chat filters">
            <button className={tab === "all" ? styles.chatTabActive : ""} type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>All</button>
            <button className={tab === "activities" ? styles.chatTabActive : ""} type="button" role="tab" aria-selected={tab === "activities"} onClick={() => setTab("activities")}>Activities</button>
          </div>
          <div className={styles.chatList}>
            {visibleChats.map((chat) => (
              <Link className={styles.chatListRow} href={chat.href} key={chat.title}>
                {chat.activity ? <span className={`${styles.chatListAvatar} ${styles.chatListActivity} ${styles[chat.art]}`} aria-hidden="true" /> : <span className={`${styles.chatListAvatar} ${styles.chatListPerson}`} aria-hidden="true">{chat.initials}</span>}
                <span className={styles.chatListCopy}><strong>{chat.title}</strong><span>{chat.preview}</span></span>
                <span className={styles.chatListMeta}><time>{chat.time}</time>{chat.unread > 0 && <span>{chat.unread}</span>}</span>
              </Link>
            ))}
          </div>
        </div>
        <nav className={styles.bottomNav} aria-label="Primary navigation">
          <Link className={styles.navItem} href="/feed"><Compass size={20} /><span>Discovery</span></Link>
          <Link className={styles.navItem} href="/activities"><CalendarDays size={20} /><span>My Activities</span></Link>
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/chats"><MessageCircle size={20} /><span>Chats</span></Link>
          <Link className={styles.navItem} href="/you"><UserRound size={20} /><span>You</span></Link>
        </nav>
      </div>
    </main>
  );
}
