import Link from "next/link";
import { MapPin, MessageCircle, UserPlus } from "lucide-react";
import styles from "../dyad.module.css";
import ProfileMenu from "./profile-menu";
import SmartBackButton from "../smart-back-button";
import { SessionInterests, SessionProfileText } from "./session-profile";

const profiles = {
  maya: {
    attended: 14,
    bio: "Designer, neighborhood wanderer, and unapologetic live-music regular. I like plans with enough structure to happen and enough room to become a story.",
    connections: 38,
    initials: "MC",
    interests: ["Live music", "City walks", "Coffee", "Museums", "Trying new places"],
    intro: "Always down for live music and a walk after.",
    name: "Maya Chen",
  },
  eli: { attended: 8, bio: "Writer, amateur cook, and enthusiastic audience member.", connections: 24, initials: "EB", interests: ["Comedy", "Concerts", "Food"], intro: "Here for good songs, bad jokes, and new faces.", name: "Eli Brooks" },
  sofia: { attended: 3, bio: "New in town and collecting reasons to explore it.", connections: 12, initials: "SM", interests: ["Art", "Parks", "Markets"], intro: "New to the city—show me your favorite spot.", name: "Sofia Martin" },
  jordan: { attended: 21, bio: "Curious by default. Usually the first person to say yes to a new plan.", connections: 51, initials: "JL", interests: ["Workshops", "Hiking", "Jazz"], intro: "I’ll bring the curiosity if you bring the plan.", name: "Jordan Lee" },
  priya: { attended: 11, bio: "Reader, listener, and fan of plans that leave room for conversation.", connections: 31, initials: "PS", interests: ["Books", "Film", "Coffee"], intro: "Low-key plans and thoughtful conversation.", name: "Priya Shah" },
  noah: { attended: 6, bio: "Weekend explorer who is always looking for the next small adventure.", connections: 19, initials: "NW", interests: ["Concerts", "Cycling", "Food"], intro: "Weekend explorer with an extra concert ticket.", name: "Noah Williams" },
  sam: { attended: 9, bio: "Always looking for the next good plan and the people who make it memorable.", connections: 27, initials: "SL", interests: ["Live music", "Museums", "Coffee", "Workshops"], intro: "Good plans are better with good company.", name: "Sam Lee" },
} as const;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ person?: string | string[] }> }) {
  const rawPerson = (await searchParams).person;
  const key = (Array.isArray(rawPerson) ? rawPerson[0] : rawPerson) as keyof typeof profiles | undefined;
  const profileKey = key && profiles[key] ? key : "maya";
  const profile = profiles[profileKey];
  const isSelf = profileKey === "sam";

  return (
    <main className={styles.pageBackdrop}>
      <article className={`${styles.mobilePage} ${styles.profilePage}`}>
        <header className={styles.profileTopbar}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/activity" />
          <ProfileMenu />
        </header>

        <section className={styles.profileHero}>
          <div className={styles.profileArt} aria-label={`${profile.name} profile picture`} />
          <h1>{isSelf ? <SessionProfileText field="name" fallback={profile.name} /> : profile.name}</h1>
          <p className={styles.profileLocation}><MapPin size={13} />San Diego, CA</p>
          <p className={styles.profileIntro}>{isSelf ? <SessionProfileText field="intro" fallback={profile.intro} quoted /> : `“${profile.intro}”`}</p>
        </section>

        <div className={styles.profileActions}>
          <button className={styles.connectButton} type="button"><UserPlus size={16} />Add Connection</button>
          <Link className={styles.messageButton} href={`/group?dm=${profileKey}`}><MessageCircle size={16} />Message</Link>
        </div>

        <dl className={styles.profileStats}>
          <div><dt>{profile.attended}</dt><dd>Activities attended</dd></div>
          <div><dt>{profile.connections}</dt><dd>Connections</dd></div>
        </dl>

        <section className={styles.profileSection}>
          <p className={styles.eyebrow}>About</p>
          <p>{isSelf ? <SessionProfileText field="bio" fallback={profile.bio} /> : profile.bio}</p>
        </section>

        <section className={styles.profileSection}>
          <p className={styles.eyebrow}>Interests</p>
          <div className={styles.profileInterests}>{isSelf ? <SessionInterests fallback={profile.interests} /> : profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
        </section>
      </article>
    </main>
  );
}
