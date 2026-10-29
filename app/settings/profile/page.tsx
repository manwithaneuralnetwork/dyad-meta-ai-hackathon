"use client";

import { useEffect, useState } from "react";
import { Camera, Check } from "lucide-react";
import SettingsShell from "../settings-shell";
import styles from "../../dyad.module.css";

const defaults = {
  name: "Sam Lee",
  intro: "Good plans are better with good company.",
  bio: "Always looking for the next good plan and the people who make it memorable.",
};

export default function EditProfilePage() {
  const [profile, setProfile] = useState(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("dyad-profile");
    if (stored) setProfile(JSON.parse(stored));
  }, []);

  function saveProfile() {
    sessionStorage.setItem("dyad-profile", JSON.stringify(profile));
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
        <label><span>Name</span><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
        <label><span>One-line introduction</span><input maxLength={90} value={profile.intro} onChange={(event) => setProfile({ ...profile, intro: event.target.value })} /></label>
        <label><span>Bio</span><textarea rows={5} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
        <p className={styles.settingsHint}>This is what people see before deciding whether to connect or invite you.</p>
        <button className={styles.settingsSaveButton} type="button" onClick={saveProfile}>{saved ? <><Check size={17} />Saved</> : "Save changes"}</button>
      </div>
    </SettingsShell>
  );
}
