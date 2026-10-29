import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Compass,
  MapPin,
  MessageCircle,
  Pencil,
  Tags,
  UserRound,
} from "lucide-react";
import styles from "../dyad.module.css";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

const accountSettings = [
  { label: "Edit profile", detail: "Photo, bio, and one-liner", href: "/settings/profile", Icon: Pencil },
  { label: "Location & distance", detail: "Shared location or a street address", href: "/settings/location", Icon: MapPin },
  { label: "Interests", detail: "Manage what shows up in Discovery", href: "/settings/interests", Icon: Tags },
  { label: "Notifications", detail: "Invites, chats, and activity updates", href: "/settings/notifications", Icon: Bell },
] as const;

type Setting = (typeof accountSettings)[number];

function SettingsSection({ title, items }: { title: string; items: readonly Setting[] }) {
  return (
    <section className={styles.youSettingsSection}>
      <h2>{title}</h2>
      <div className={styles.youSettingsList}>
        {items.map(({ label, detail, href, Icon }) => (
          <Link className={styles.youSettingRow} href={href} key={label}>
            <span className={styles.youSettingIcon}><Icon size={19} /></span>
            <span className={styles.youSettingCopy}><strong>{label}</strong><span>{detail}</span></span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function YouPage() {
  return (
    <main className={styles.pageBackdrop}>
      <div className={`${styles.mobilePage} ${styles.feedPage}`}>
        <header className={styles.feedHeader}>
          <Link href="/" aria-label="Back to Dyad home"><Logo /></Link>
          <span className={styles.profileBadge}>SL</span>
        </header>

        <div className={`${styles.feedScroll} ${styles.youScroll}`}>
          <h1>Profile</h1>

          <Link className={styles.youProfileCard} href="/profile?person=sam">
            <span className={styles.youAvatar} aria-hidden="true" />
            <span className={styles.youProfileCopy}><strong>Sam Lee</strong><span>View your public profile</span></span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>

          <SettingsSection title="Settings" items={accountSettings} />
        </div>

        <nav className={styles.bottomNav} aria-label="Primary navigation">
          <Link className={styles.navItem} href="/feed"><Compass size={20} /><span>Discovery</span></Link>
          <Link className={styles.navItem} href="/activities"><CalendarDays size={20} /><span>My Activities</span></Link>
          <Link className={styles.navItem} href="/chats"><MessageCircle size={20} /><span>Chats</span></Link>
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/you"><UserRound size={20} /><span>You</span></Link>
        </nav>
      </div>
    </main>
  );
}
