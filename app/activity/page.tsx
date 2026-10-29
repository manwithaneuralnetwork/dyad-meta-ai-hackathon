import Link from "next/link";
import {
  Bookmark,
  CalendarDays,
  Heart,
  MapPin,
  Ticket,
  UsersRound,
} from "lucide-react";
import styles from "../dyad.module.css";
import FindCompanySheet from "./find-company-sheet";
import SmartBackButton from "../smart-back-button";

const facts = [
  { label: "When", value: "Friday, November 6 · 7:30–9:30 PM", Icon: CalendarDays },
  { label: "Where", value: "The Courtyard at Marina Park · 222 Marina Park Way", Icon: MapPin },
  { label: "Interested", value: "24 people are interested", Icon: UsersRound },
  { label: "Tickets", value: "$15 · General admission", Icon: Ticket },
];

export default function ActivityPage() {
  return (
    <main className={styles.pageBackdrop}>
      <article className={`${styles.mobilePage} ${styles.activityPage}`}>
        <div className={styles.activityHero} aria-label="Abstract artwork for Jazz in the Courtyard">
          <div className={styles.activityTopbar}>
            <SmartBackButton className={`${styles.heroIcon} ${styles.heroBack}`} fallbackHref="/feed" label="Go back" size={22} />
            <button className={styles.heroIcon} type="button" aria-label="Save Jazz in the Courtyard"><Bookmark size={18} /></button>
          </div>
          <div className={styles.activityCarouselDots} aria-label="Image 1 of 3">
            <span className={styles.activityCarouselDotActive} />
            <span />
            <span />
          </div>
        </div>

        <div className={styles.activityBody}>
          <p className={styles.activityDate}>Fri, Nov 6 · 7:30 PM</p>
          <h1 className={styles.activityHeading}>Jazz in the Courtyard</h1>

          <div className={styles.tagList} aria-label="Activity topics">
            <span className={styles.tag}>Live music</span>
            <span className={styles.tag}>Jazz</span>
            <span className={styles.tag}>Outdoors</span>
            <span className={styles.tag}>Easygoing</span>
          </div>

          <div className={styles.activityActions}>
            <button className={styles.activityAction} type="button"><Heart size={16} />Interested</button>
            <FindCompanySheet />
          </div>

          <dl className={styles.activityFacts}>
            {facts.map(({ label, value, Icon }) => (
              <div className={styles.activityFact} key={label}>
                <span className={styles.factIcon}><Icon size={17} aria-hidden="true" /></span>
                <div><dt>{label}</dt><dd>{value}</dd></div>
              </div>
            ))}
          </dl>

          <section className={styles.activitySection}>
            <h2>About this activity</h2>
            <p>Ease into Friday night with an open-air set, warm lights, and enough room to actually hear each other talk. Come for the music, stay for a drink, and meet a few people who picked the same plan.</p>
          </section>

          <section className={styles.activitySection}>
            <h2>Hosted by</h2>
            <div className={styles.hostCard}>
              <span className={styles.hostMark}>MP</span>
              <div><strong>Marina Park Arts Collective</strong><span>Local events · 4.9 community rating</span></div>
            </div>
          </section>

          <section className={styles.activitySection}>
            <h2>Good to know</h2>
            <div className={styles.goodToKnow}><span>Outdoor seating</span><span>Accessible venue</span><span>Drinks available</span></div>
          </section>
        </div>
      </article>
    </main>
  );
}
