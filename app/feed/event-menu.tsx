"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import styles from "../dyad.module.css";

export default function EventMenu({ title, href }: { title: string; href: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className={styles.eventMenuWrap}>
      <button
        className={`${styles.iconButton} ${styles.menuButton}`}
        type="button"
        aria-label={`More options for ${title}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={21} />
      </button>
      {open ? (
        <>
          <button className={styles.eventMenuDismiss} type="button" aria-label="Close activity menu" onClick={() => setOpen(false)} />
          <div className={styles.eventMenu} role="menu">
            <Link href={href} role="menuitem" onClick={() => setOpen(false)}>
              <ArrowUpRight size={17} aria-hidden="true" />
              View activity
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
