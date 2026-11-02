"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Compass, UserRound, UsersRound } from "lucide-react";
import styles from "../dyad.module.css";
import { AppHeader, BottomNavigation } from "../app-navigation";
import { resolveViewer, type PublicProfile } from "@/lib/activity-data";
import { listFriends } from "@/lib/friend-data";

export default function FriendsPage() {
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const viewer = await resolveViewer();
      setFriends(await listFriends(viewer));
    } catch {
      setError("Your Friends couldn’t be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <AppHeader />
        <div className={`${styles.feedScroll} ${styles.friendsScroll}`}>
          <h1>Friends</h1>
          <p className={styles.friendsIntro}>People you’ve chosen to make plans with again.</p>
          {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
          {loading ? <section className={styles.emptyState}><h2>Loading Friends…</h2></section> : friends.length ? (
            <section className={styles.friendList} aria-label="Your Friends">
              {friends.map((friend) => (
                <Link className={styles.friendRow} href={`/profile?person=${friend.id}`} key={friend.id}>
                  <span className={styles.friendAvatar}>{friend.avatar_url ? <img src={friend.avatar_url} alt="" /> : <UserRound size={20} />}</span>
                  <span className={styles.friendCopy}><strong>{friend.display_name || "Dyad member"}</strong><span>{friend.one_liner ? `“${friend.one_liner}”` : `${friend.attended_count} activities attended`}</span></span>
                  <span className={styles.friendChevron}>›</span>
                </Link>
              ))}
            </section>
          ) : (
            <section className={styles.emptyState}>
              <span className={styles.emptyStateIcon}><UsersRound size={22} /></span>
              <h2>No Friends yet</h2>
              <p>Meet through an activity, open someone’s profile, and add them when you’d like to make another plan.</p>
              <Link href="/feed"><Compass size={15} />Explore Discovery</Link>
            </section>
          )}
        </div>
        <BottomNavigation active="you" />
      </div>
    </main>
  );
}
