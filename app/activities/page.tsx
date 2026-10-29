import Link from "next/link";
import { CalendarDays, ChevronRight, Compass, MessageCircle, Search, UserRound } from "lucide-react";
import styles from "../dyad.module.css";

const groupActivities = [
  { title: "Jazz in the Courtyard", detail: "Maya: I’ll drop one here before we head over.", meta: "10:53 AM", art: "jazz", href: "/group" },
  { title: "Beginner Woodworking Workshop", detail: "Eli: I can bring an extra pair of gloves.", meta: "Yesterday", art: "workshop", href: "/group" },
] as const;

const interestedActivities = [
  { title: "San Diego Museum of Art: After Hours", detail: "1450 El Prado", meta: "Sat, Nov 7 · 6:00 PM", art: "museum", href: "/activity" },
  { title: "Civic Theatre: The California Sound", detail: "1100 Third Ave", meta: "Sun, Nov 8 · 7:00 PM", art: "theatre", href: "/activity" },
] as const;

const savedActivities = [
  { title: "Harbor Pottery Social", detail: "Barrio Logan Arts District", meta: "Thu, Nov 12 · 6:30 PM", art: "workshop", href: "/activity" },
  { title: "Coffee & Street Photography", detail: "North Park Way", meta: "Sat, Nov 14 · 9:00 AM", art: "jazz", href: "/activity" },
] as const;

const pastActivities = [
  { title: "Sunday Coastal Cleanup", detail: "Ocean Front Walk", meta: "Passed · Nov 1", art: "jazz", href: "/activity" },
  { title: "Rooftop Film Night", detail: "Liberty Station", meta: "Passed · Oct 29", art: "museum", href: "/activity" },
] as const;

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

type ActivityItem = (typeof groupActivities)[number] | (typeof interestedActivities)[number] | (typeof savedActivities)[number] | (typeof pastActivities)[number];
type ActivityKind = "group" | "interested" | "saved" | "past";

function ActivityRow({ item, kind }: { item: ActivityItem; kind: ActivityKind }) {
  return (
    <Link className={`${styles.myActivityRow} ${kind === "past" ? styles.myActivityPast : ""}`} href={item.href}>
      <span className={`${styles.myActivityArt} ${styles[item.art]}`} aria-hidden="true" />
      <span className={styles.myActivityCopy}>
        <span className={styles.myActivityMeta}>{kind === "group" && <MessageCircle size={11} />}{item.meta}</span>
        <strong>{item.title}</strong>
        <span className={styles.myActivityDetail}>{item.detail}</span>
      </span>
      <ChevronRight className={styles.myActivityChevron} size={18} aria-hidden="true" />
    </Link>
  );
}

function ActivitySection({ title, items, kind }: { title: string; items: readonly ActivityItem[]; kind: ActivityKind }) {
  return (
    <section className={styles.myActivitySection}>
      <div className={styles.myActivitySectionHeading}><h2>{title}</h2><span>{items.length}</span></div>
      <div className={styles.myActivityList}>{items.map((item) => <ActivityRow item={item} kind={kind} key={item.title} />)}</div>
    </section>
  );
}

export default function MyActivitiesPage() {
  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <header className={styles.feedHeader}>
          <Link href="/" aria-label="Back to Dyad home"><Logo /></Link>
          <span className={styles.profileBadge}>SL</span>
        </header>
        <div className={`${styles.feedScroll} ${styles.myActivitiesScroll}`}>
          <h1>My Activities</h1>
          <label className={styles.activitiesSearch}><Search size={17} aria-hidden="true" /><input type="search" placeholder="Search your activities" aria-label="Search your activities" /></label>
          <ActivitySection title="Your groups" items={groupActivities} kind="group" />
          <ActivitySection title="Interested" items={interestedActivities} kind="interested" />
          <ActivitySection title="Saved" items={savedActivities} kind="saved" />
          <ActivitySection title="Past" items={pastActivities} kind="past" />
        </div>
        <nav className={styles.bottomNav} aria-label="Primary navigation">
          <Link className={styles.navItem} href="/feed"><Compass size={20} /><span>Discovery</span></Link>
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/activities"><CalendarDays size={20} /><span>My Activities</span></Link>
          <Link className={styles.navItem} href="/chats"><MessageCircle size={20} /><span>Chats</span></Link>
          <Link className={styles.navItem} href="/you"><UserRound size={20} /><span>You</span></Link>
        </nav>
      </div>
    </main>
  );
}
