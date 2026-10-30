"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, MapPin, MessageCircle, UserPlus } from "lucide-react";
import styles from "../dyad.module.css";
import ProfileMenu from "./profile-menu";
import SmartBackButton from "../smart-back-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveViewer, type PublicProfile } from "@/lib/activity-data";

export default function ProfileClient({ requestedId }: { requestedId?: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [isSelf, setIsSelf] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const viewer = await resolveViewer();
      const profileId = requestedId === "me" || !requestedId ? (viewer.kind === "real" ? viewer.userId : undefined) : requestedId;
      if (!profileId || viewer.kind !== "real") { if (active) setLoading(false); return; }
      const supabase = createSupabaseBrowserClient();
      if (!supabase) { if (active) setLoading(false); return; }
      const [profileResult, interestResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
        supabase.from("profile_interests").select("interest").eq("user_id", profileId).order("interest"),
      ]);
      if (active && !profileResult.error) {
        setProfile(profileResult.data);
        setInterests(interestResult.data?.map((item) => item.interest) ?? []);
        setIsSelf(viewer.userId === profileId);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [requestedId]);

  if (loading) return <ProfileEmpty title="Loading profile…" />;
  if (!profile) return <ProfileEmpty title="Profile not found" body="This person isn’t available, or you’re browsing in demo mode." />;

  return (
    <main className={styles.pageBackdrop}>
      <article className={`${styles.mobilePage} ${styles.profilePage}`}>
        <header className={styles.profileTopbar}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/feed" />
          {!isSelf ? <ProfileMenu /> : <span />}
        </header>
        <section className={styles.profileHero}>
          <div className={styles.profileArt} aria-label={`${profile.display_name || "Dyad member"} profile picture`} style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined} />
          <h1>{profile.display_name || "Dyad member"}</h1>
          {profile.city ? <p className={styles.profileLocation}><MapPin size={13} />{profile.city}</p> : null}
          {profile.one_liner ? <p className={styles.profileIntro}>“{profile.one_liner}”</p> : null}
        </section>
        {!isSelf ? <div className={styles.profileActions}>
          <button className={styles.connectButton} type="button" disabled title="Connections arrive in the next checkpoint"><UserPlus size={16} />Add Connection</button>
          <button className={styles.messageButton} type="button" disabled title="Messaging arrives in the next checkpoint"><MessageCircle size={16} />Message</button>
        </div> : null}
        <dl className={`${styles.profileStats} ${styles.profileStatsSingle}`}><div><dt>{profile.attended_count}</dt><dd>Activities attended</dd></div></dl>
        <section className={styles.profileSection}><p className={styles.eyebrow}>About</p><p>{profile.bio || "No bio added yet."}</p></section>
        <section className={styles.profileSection}><p className={styles.eyebrow}>Interests</p>{interests.length ? <div className={styles.profileInterests}>{interests.map((interest) => <span key={interest}>{interest}</span>)}</div> : <p className={styles.mutedEmptyText}>No interests added yet.</p>}</section>
      </article>
    </main>
  );
}

function ProfileEmpty({ title, body }: { title: string; body?: string }) {
  return <main className={styles.pageBackdrop}><article className={`${styles.mobilePage} ${styles.profilePage}`}><header className={styles.simplePageHeader}><SmartBackButton className={styles.plainBackButton} fallbackHref="/feed" /><strong>Profile</strong><span /></header><section className={styles.emptyState}><h1>{title}</h1>{body ? <p>{body}</p> : null}<Link href="/feed"><Compass size={15} />Go to Discovery</Link></section></article></main>;
}
