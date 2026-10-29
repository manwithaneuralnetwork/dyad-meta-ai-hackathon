import Link from "next/link";
import {
  Bookmark,
  CalendarDays,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  UserRound,
  UsersRound,
} from "lucide-react";
import styles from "../dyad.module.css";
import EventMenu from "./event-menu";

const events = [
  { date: "Fri, Nov 6 · 7:30 PM", title: "Jazz in the Courtyard", address: "222 Marina Park Way", art: "jazz", href: "/activity" },
  { date: "Sat, Nov 7 · 11:00 AM", title: "Beginner Woodworking Workshop", address: "2640 Historic Decatur Rd", art: "workshop", href: null },
  { date: "Sat, Nov 7 · 6:00 PM", title: "San Diego Museum of Art: After Hours", address: "1450 El Prado", art: "museum", href: null },
  { date: "Sun, Nov 8 · 7:00 PM", title: "Civic Theatre: The California Sound", address: "1100 Third Ave", art: "theatre", href: null },
] as const;

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

function EventRow({ event }: { event: (typeof events)[number] }) {
  return (
    <article className={styles.eventRow}>
      {event.href ? (
        <Link className={styles.eventArtworkLink} href={event.href} aria-label={`Open ${event.title}`}>
          <span className={`${styles.eventArtwork} ${styles[event.art]}`} aria-hidden="true" />
        </Link>
      ) : <div className={`${styles.eventArtwork} ${styles[event.art]}`} aria-hidden="true" />}
      <div className={styles.eventDetails}>
        <EventMenu href={event.href ?? "/activity"} title={event.title} />
        <p className={styles.eventDate}>{event.date}</p>
        <h2>{event.href ? <Link href={event.href}>{event.title}</Link> : event.title}</h2>
        <p className={styles.eventAddress}><MapPin size={13} aria-hidden="true" />{event.address}</p>
        <div className={styles.eventActions}>
          <button className={`${styles.actionPill} ${styles.actionPrimary}`} type="button"><Heart size={12} aria-hidden="true" />Interested</button>
          <button className={styles.actionPill} type="button"><UsersRound size={12} aria-hidden="true" />Find company</button>
        </div>
        <button className={`${styles.iconButton} ${styles.saveButton}`} type="button" aria-label={`Save ${event.title}`}><Bookmark size={15} /></button>
      </div>
    </article>
  );
}

function BottomNavigation() {
  return (
    <nav className={styles.bottomNav} aria-label="Primary navigation">
      <Link className={`${styles.navItem} ${styles.navActive}`} href="/feed"><Compass size={20} /><span>Discovery</span></Link>
      <Link className={styles.navItem} href="/activities"><CalendarDays size={20} /><span>My Activities</span></Link>
      <Link className={styles.navItem} href="/chats"><MessageCircle size={20} /><span>Chats</span></Link>
      <Link className={styles.navItem} href="/you"><UserRound size={20} /><span>You</span></Link>
    </nav>
  );
}

export default function FeedPage() {
  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <header className={styles.feedHeader}>
          <Link href="/" aria-label="Back to Dyad home"><Logo /></Link>
          <span className={styles.profileBadge}>SL</span>
        </header>
        <div className={styles.feedScroll}>
          <h1>Discover</h1>
          <section className={styles.eventList} aria-label="Nearby activities">
            {events.map((event) => <EventRow event={event} key={event.title} />)}
          </section>
        </div>
        <BottomNavigation />
      </div>
    </main>
  );
}
