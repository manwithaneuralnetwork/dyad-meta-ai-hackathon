"use client";

import { useEffect, useState } from "react";
import { Flag, MoreHorizontal, ShieldBan } from "lucide-react";
import styles from "../dyad.module.css";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className={styles.profileMenuWrap}>
      <button className={styles.plainMenuButton} type="button" aria-label="Profile options" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal size={22} /></button>
      {open && (
        <>
          <button className={styles.profileMenuDismiss} type="button" aria-label="Close profile menu" onClick={() => setOpen(false)} />
          <div className={styles.profileMenu} role="menu">
            <button type="button" role="menuitem"><ShieldBan size={15} />Block</button>
            <button type="button" role="menuitem"><Flag size={15} />Report</button>
          </div>
        </>
      )}
    </div>
  );
}
