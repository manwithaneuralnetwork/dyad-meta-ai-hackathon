"use client";

import { useEffect, useState } from "react";
import SettingsShell from "../settings-shell";
import styles from "../../dyad.module.css";

const defaults = { enabled: true, invites: true, messages: true, reminders: true, friends: false };

export default function NotificationsSettingsPage() {
  const [values, setValues] = useState(defaults);

  useEffect(() => {
    const stored = sessionStorage.getItem("dyad-notifications");
    if (stored) setValues({ ...defaults, ...JSON.parse(stored) });
  }, []);

  function toggle(key: keyof typeof defaults) {
    setValues((current) => {
      const next = { ...current, [key]: !current[key] };
      sessionStorage.setItem("dyad-notifications", JSON.stringify(next));
      return next;
    });
  }

  const rows = [
    { key: "invites" as const, label: "Group invitations", detail: "When someone invites you to join a plan" },
    { key: "messages" as const, label: "New messages", detail: "Messages from groups and Friends" },
    { key: "reminders" as const, label: "Activity reminders", detail: "A helpful heads-up before an activity starts" },
    { key: "friends" as const, label: "Friend activity", detail: "Requests and new Friend updates" },
  ];

  return (
    <SettingsShell title="Notifications">
      <div className={styles.notificationMaster}>
        <span><strong>Allow notifications</strong><small>Turn every Dyad notification on or off</small></span>
        <button className={`${styles.settingsSwitch} ${values.enabled ? styles.settingsSwitchOn : ""}`} type="button" role="switch" aria-checked={values.enabled} aria-label="Allow notifications" onClick={() => toggle("enabled")}><span /></button>
      </div>
      <div className={`${styles.notificationList} ${!values.enabled ? styles.notificationListDisabled : ""}`}>
        {rows.map((row) => (
          <div className={styles.notificationRow} key={row.key}>
            <span><strong>{row.label}</strong><small>{row.detail}</small></span>
            <button className={`${styles.settingsSwitch} ${values[row.key] ? styles.settingsSwitchOn : ""}`} type="button" role="switch" aria-checked={values[row.key]} aria-label={row.label} onClick={() => toggle(row.key)} disabled={!values.enabled}><span /></button>
          </div>
        ))}
      </div>
      <p className={styles.settingsHint}>These preferences last only for this demo session.</p>
    </SettingsShell>
  );
}
