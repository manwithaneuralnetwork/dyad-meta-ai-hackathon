import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Coffee, MapPin, Music2, Palette, Sparkles, Users } from "lucide-react";
import MuseMark from "../muse-mark";
import styles from "./visual.module.css";

export const metadata: Metadata = {
  title: "Dyad Visual — Plans become people",
  description: "A living view of how shared interests become activities, groups, and real connections through Dyad.",
};

export default function DyadVisualPage() {
  return (
    <main className={styles.visualPage}>
      <header className={styles.visualHeader}>
        <Link href="/" aria-label="Back to Dyad"><ArrowLeft size={20} /></Link>
        <span>Dyad Visual</span>
        <span className={styles.liveIndicator}><i />Live network</span>
      </header>

      <section className={styles.visualStage} aria-label="Animated network connecting San Diego places, activities, interests, and people">
        <div className={styles.ambientGlow} />
        <svg className={styles.networkLines} viewBox="0 0 430 660" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="dyad-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#35e6c1" stopOpacity=".14" />
              <stop offset=".5" stopColor="#35e6c1" stopOpacity=".9" />
              <stop offset="1" stopColor="#ffffff" stopOpacity=".2" />
            </linearGradient>
          </defs>
          <g className={styles.primaryLines}>
            <path d="M215 320 L72 88" /><path d="M215 320 L354 86" /><path d="M215 320 L358 205" />
            <path d="M215 320 L74 235" /><path d="M215 320 L353 304" /><path d="M215 320 L70 373" />
            <path d="M215 320 L350 430" /><path d="M215 320 L94 515" /><path d="M215 320 L338 548" />
            <path d="M215 320 L215 624" />
          </g>
          <g className={styles.secondaryLines}>
            <path d="M72 88 Q150 168 74 235" /><path d="M354 86 Q314 185 353 304" />
            <path d="M358 205 Q302 246 353 304" /><path d="M74 235 Q40 310 70 373" />
            <path d="M70 373 Q74 450 94 515" /><path d="M353 304 Q385 373 350 430" />
            <path d="M350 430 Q371 500 338 548" /><path d="M94 515 Q145 586 215 624" />
            <path d="M338 548 Q283 604 215 624" />
          </g>
          <g className={styles.signalDots}>
            <circle r="3"><animateMotion dur="5s" repeatCount="indefinite" path="M72 88 L215 320 L353 304" /></circle>
            <circle r="3"><animateMotion dur="6.4s" repeatCount="indefinite" path="M358 205 L215 320 L94 515" /></circle>
            <circle r="2.5"><animateMotion dur="4.8s" repeatCount="indefinite" path="M70 373 L215 320 L338 548" /></circle>
          </g>
        </svg>

        <div className={`${styles.nodeWrap} ${styles.sanDiego}`}><div className={`${styles.networkNode} ${styles.locationNode}`}><MapPin size={15} /><span><strong>San Diego</strong><small>demo city</small></span></div></div>
        <div className={`${styles.nodeWrap} ${styles.balboa}`}><div className={`${styles.networkNode} ${styles.locationNode}`}><MapPin size={14} /><span><strong>Balboa Park</strong><small>12 plans</small></span></div></div>
        <div className={`${styles.nodeWrap} ${styles.laJolla}`}><div className={`${styles.networkNode} ${styles.locationNode} ${styles.locationSmall}`}><MapPin size={13} /><span><strong>La Jolla</strong></span></div></div>

        <div className={`${styles.nodeWrap} ${styles.maya}`}><div className={`${styles.personNode} ${styles.personAqua}`}><span>MC</span><small>Maya</small></div></div>
        <div className={`${styles.nodeWrap} ${styles.sofia}`}><div className={`${styles.personNode} ${styles.personLight}`}><span>SM</span><small>Sofia</small></div></div>

        <div className={`${styles.nodeWrap} ${styles.museum}`}><div className={`${styles.networkNode} ${styles.activityNode}`}><Palette size={14} /><span><strong>Museum after hours</strong><small>activity</small></span></div></div>
        <div className={`${styles.nodeWrap} ${styles.music}`}><div className={`${styles.networkNode} ${styles.activityNode}`}><Music2 size={14} /><span><strong>Live music</strong><small>activity</small></span></div></div>
        <div className={`${styles.nodeWrap} ${styles.coffee}`}><div className={`${styles.networkNode} ${styles.activityNode}`}><Coffee size={14} /><span><strong>Coffee walk</strong><small>activity</small></span></div></div>

        <div className={`${styles.nodeWrap} ${styles.creative}`}><div className={`${styles.networkNode} ${styles.tagNode}`}><span>Creative</span></div></div>
        <div className={`${styles.nodeWrap} ${styles.outdoors}`}><div className={`${styles.networkNode} ${styles.tagNode}`}><span>Outdoors</span></div></div>

        <div className={styles.coreWrap}>
          <div className={styles.coreOrbit}><span /><span /><span /></div>
          <div className={styles.core}>
            <div className={styles.coreLogo}><span className={styles.coreLogoMark}><i /></span><strong>dyad</strong></div>
            <p>Plans become people.</p>
            <span className={styles.poweredBy}><MuseMark size={16} tone="dark" />Muse · Meta AI</span>
          </div>
        </div>
      </section>

      <footer className={styles.visualFooter}>
        <p><Sparkles size={13} /> Shared interests become real groups—and real reasons to show up.</p>
        <div><span><i className={styles.locationKey} />Place</span><span><i className={styles.activityKey} />Activity</span><span><i className={styles.personKey} />Person</span><span><i className={styles.tagKey} />Interest</span></div>
      </footer>
    </main>
  );
}
