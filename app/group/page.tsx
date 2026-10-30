import Link from "next/link";
import { Compass, MessageCircle } from "lucide-react";
import styles from "../dyad.module.css";
import SmartBackButton from "../smart-back-button";

export default function GroupChatPage() {
  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.groupPage}`}>
        <header className={styles.simplePageHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/chats" />
          <strong>Conversation</strong>
          <span />
        </header>
        <section className={styles.emptyState}>
          <span className={styles.emptyStateIcon}><MessageCircle size={22} /></span>
          <h1>No conversation here yet</h1>
          <p>Create a group from an activity’s Find company sheet. Real-time group chat arrives in the next implementation checkpoint.</p>
          <Link href="/feed"><Compass size={15} />Explore Discovery</Link>
        </section>
      </section>
    </main>
  );
}
