"use client";

import type { ReactNode } from "react";
import SmartBackButton from "../smart-back-button";
import styles from "../dyad.module.css";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function SettingsShell({ children, eyebrow, title }: { children: ReactNode; eyebrow?: string; title: string }) {
  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.settingsPage}`}>
        <header className={styles.settingsHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/you" />
          <Logo />
          <span />
        </header>
        <div className={styles.settingsBody}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1>{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
