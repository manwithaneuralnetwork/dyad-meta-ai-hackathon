"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Inbox, MapPin, Pencil, Tags } from "lucide-react";
import styles from "../dyad.module.css";
import { AppHeader, BottomNavigation } from "../app-navigation";
import { getViewerProfile, resolveViewer, type PublicProfile, type Viewer } from "@/lib/activity-data";

const accountSettings = [
  { label: "Inbox", detail: "Invitations and plan updates", href: "/inbox", Icon: Inbox },
  { label: "Edit profile", detail: "Photo, bio, and one-liner", href: "/settings/profile", Icon: Pencil },
  { label: "Location & distance", detail: "Shared location or a street address", href: "/settings/location", Icon: MapPin },
  { label: "Interests", detail: "Manage what shows up in Discovery", href: "/settings/interests", Icon: Tags },
  { label: "Notifications", detail: "Choose which updates reach you", href: "/settings/notifications", Icon: Bell },
] as const;

export default function YouPage() {
  const [viewer, setViewer] = useState<Viewer>({ kind: "anonymous" });
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  useEffect(() => { void (async () => { const next = await resolveViewer(); setViewer(next); setProfile(await getViewerProfile(next)); })(); }, []);

  const name = viewer.kind === "demo" ? "Demo profile" : profile?.display_name || "Complete your profile";
  const profileHref = viewer.kind === "real" ? `/profile?person=${viewer.userId}` : "/settings/profile";
  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <AppHeader />
        <div className={`${styles.feedScroll} ${styles.youScroll}`}>
          <h1>Profile</h1>
          <Link className={styles.youProfileCard} href={profileHref}>
            <span className={styles.youAvatar} aria-hidden="true" />
            <span className={styles.youProfileCopy}><strong>{name}</strong><span>{viewer.kind === "real" ? "View your public profile" : "Set up this session’s profile"}</span></span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
          <section className={styles.youSettingsSection}>
            <h2>Settings</h2>
            <div className={styles.youSettingsList}>{accountSettings.map(({ label, detail, href, Icon }) => <Link className={styles.youSettingRow} href={href} key={label}><span className={styles.youSettingIcon}><Icon size={19} /></span><span className={styles.youSettingCopy}><strong>{label}</strong><span>{detail}</span></span><ChevronRight size={18} aria-hidden="true" /></Link>)}</div>
          </section>
        </div>
        <BottomNavigation active="you" />
      </div>
    </main>
  );
}
