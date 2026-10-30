"use client";

import { useEffect, useState } from "react";
import { Camera, Check } from "lucide-react";
import SettingsShell from "../settings-shell";
import styles from "../../dyad.module.css";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getViewerProfile, resolveViewer, type Viewer } from "@/lib/activity-data";

const defaults = {
  name: "",
  age: "",
  intro: "",
  bio: "",
};

export default function EditProfilePage() {
  const [profile, setProfile] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const [viewer, setViewer] = useState<Viewer>({ kind: "anonymous" });

  useEffect(() => {
    void (async () => {
      const nextViewer = await resolveViewer();
      setViewer(nextViewer);
      if (nextViewer.kind === "real") {
        const stored = await getViewerProfile(nextViewer);
        if (stored) setProfile({ name: stored.display_name, age: stored.age ? String(stored.age) : "", intro: stored.one_liner, bio: stored.bio });
      } else {
        const stored = sessionStorage.getItem("dyad-profile");
        if (stored) setProfile(JSON.parse(stored));
      }
    })();
  }, []);

  async function saveProfile() {
    if (viewer.kind === "real") {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { error } = await supabase.from("profiles").update({ display_name: profile.name.trim(), age: Number(profile.age), one_liner: profile.intro.trim(), bio: profile.bio.trim() }).eq("id", viewer.userId);
      if (error) return;
    } else sessionStorage.setItem("dyad-profile", JSON.stringify(profile));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <SettingsShell eyebrow="Public profile" title="Edit profile">
      <div className={styles.editProfilePhoto}>
        <span className={styles.youAvatar} aria-hidden="true" />
        <button type="button"><Camera size={16} />Change photo</button>
      </div>
      <div className={styles.settingsForm}>
        <label><span>Name</span><input placeholder="Your name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
        <label><span>Age</span><input type="number" inputMode="numeric" min={18} max={120} placeholder="Your age" value={profile.age} onChange={(event) => setProfile({ ...profile, age: event.target.value })} /></label>
        <label><span>One-line introduction</span><input maxLength={90} value={profile.intro} onChange={(event) => setProfile({ ...profile, intro: event.target.value })} /></label>
        <label><span>Bio</span><textarea rows={5} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
        <p className={styles.settingsHint}>This is what people see before deciding whether to connect or invite you.</p>
        <button className={styles.settingsSaveButton} type="button" onClick={() => void saveProfile()} disabled={!profile.name.trim() || Number(profile.age) < 18 || Number(profile.age) > 120}>{saved ? <><Check size={17} />Saved</> : "Save changes"}</button>
      </div>
    </SettingsShell>
  );
}
