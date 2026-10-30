"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, MapPin, MoreHorizontal, UserPlus } from "lucide-react";
import styles from "../dyad.module.css";
import SmartBackButton from "../smart-back-button";

type ChatHeaderProps = {
  activityHref?: string;
  backHref: string;
  direct: boolean;
  imageLabel: string;
  location?: string;
  onInvite?: () => void;
  onLeave?: () => void;
  subtitle: string;
  title: string;
};

export default function ChatHeader({ activityHref = "/feed", backHref, direct, imageLabel, location, onInvite, onLeave, subtitle, title }: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLocationOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className={styles.groupHeader}>
      <SmartBackButton className={styles.groupBack} fallbackHref={backHref} />
      {direct ? (
        <span className={`${styles.groupImage} ${styles.directImage}`} aria-hidden="true">{imageLabel}</span>
      ) : (
        <Link className={`${styles.groupImage} ${styles.activityGroupImage}`} href={activityHref} aria-label={`Open ${title}`} />
      )}
      <div className={styles.groupHeading}>
        <h1>{direct ? title : <Link href={activityHref}>{title}</Link>}</h1>
        <p>{subtitle}</p>
      </div>
      <div className={styles.groupTools}>
        {!direct && (
          <div className={styles.groupLocationWrap}>
            <button className={styles.groupIconButton} type="button" aria-label="Show activity location" aria-expanded={locationOpen} onClick={() => { setLocationOpen((value) => !value); setMenuOpen(false); }}><MapPin size={19} /></button>
            {locationOpen && (
              <div className={styles.groupLocationCard} role="status">
                <span>Activity location</span>
                <strong>{location || "See activity details"}</strong>
              </div>
            )}
          </div>
        )}
        <button className={styles.groupIconButton} type="button" aria-label="Conversation menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen((value) => !value); setLocationOpen(false); }}><MoreHorizontal size={21} /></button>
        {menuOpen && (
          <>
            <button className={styles.groupMenuDismiss} type="button" aria-label="Close conversation menu" onClick={() => setMenuOpen(false)} />
            <div className={styles.groupMenu} role="menu">
              {!direct && <button className={styles.groupMenuAction} type="button" role="menuitem" onClick={() => { setMenuOpen(false); onInvite?.(); }}><UserPlus size={15} />Invite people</button>}
              <button className={styles.leaveGroupButton} type="button" role="menuitem" onClick={onLeave}><LogOut size={15} />{direct ? "Close conversation" : "Leave group"}</button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
