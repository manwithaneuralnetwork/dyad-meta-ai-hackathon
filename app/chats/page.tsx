"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, MessageCircle } from "lucide-react";
import styles from "../dyad.module.css";
import { AppHeader, BottomNavigation } from "../app-navigation";

export default function ChatsPage() {
  const [tab, setTab] = useState<"all" | "activities">("all");
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
          <section className={styles.emptyState}>
            <span className={styles.emptyStateIcon}><MessageCircle size={22} /></span>
            <h2>{tab === "activities" ? "No activity chats yet" : "No conversations yet"}</h2>
            <p>{tab === "activities" ? "Activity groups you create or join will appear here." : "Find an activity and invite some company to start a conversation."}</p>
            <Link href="/feed"><Compass size={15} />Explore Discovery</Link>
          </section>
        </div>
        <BottomNavigation active="chats" />
      </div>
    </main>
  );
}
