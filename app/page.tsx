import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./dyad.module.css";

const reasons = [
  { number: "01", title: "Always have something to talk about.", body: "The activity keeps conversation moving naturally—before, during, and after." },
  { number: "02", title: "Meet people through real moments.", body: "Shared experiences show how people listen, participate, laugh, and connect." },
  { number: "03", title: "Choose plans that already fit your life.", body: "Recommendations account for your interests, schedule, location, and budget." }
];

const steps = [
  ["1", "Share what gets you out.", "Your interests shape the feed."],
  ["2", "Choose something worth doing.", "Real recommendations, grounded in fit."],
  ["3", "Find company when you want it.", "Opt in only for the plans you choose."]
];

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function LandingPage() {
  return (
    <main className={styles.pageBackdrop}>
      <div className={styles.mobilePage}>
        <header className={styles.landingHeader}>
          <Logo />
          <nav className={styles.headerActions} aria-label="Account navigation">
            <Link className={styles.loginLink} href="/login">Log in</Link>
            <Link className={styles.darkPillSmall} href="/signup">Get started</Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <h1>Find things to do—and people to do them with.</h1>
          <p>Meaningful friendships begin when people care about the same thing, show up, and have a reason to talk.</p>
          <Link className={styles.aquaPill} href="/signup">Get started <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>

        <section className={styles.activityArtwork} aria-label="Example nearby plans">
          <div className={styles.artRing} /><div className={styles.artDisc} /><div className={styles.artSquare} />
          <div className={styles.artworkTopline}><span>Plans nearby</span><span>This weekend</span></div>
          <div className={styles.planStack}>
            <div className={styles.planCardLight}>
              <span className={styles.aquaDot} />
              <span><strong>Local jazz concert</strong><small>Sat · Balboa Park · $15 · 12 going</small></span>
            </div>
            <div className={styles.planCardAqua}>
              <span className={styles.miniMark}><span /></span>
              <span><strong>Community wood sculpture workshop</strong><small>Sun · City Heights · Free · 18 going</small></span>
            </div>
          </div>
        </section>

        <section className={styles.whySection}>
          <p className={styles.eyebrow}>Why activities work</p>
          <h2>Give connection something real to grow from.</h2>
          <p className={styles.sectionIntro}>A shared activity gives conversation somewhere to go—and gives both people a reason to stay present.</p>
          <div className={styles.reasonList}>{reasons.map((reason) => (
            <article className={styles.reason} key={reason.number}>
              <span>{reason.number}</span><div><h3>{reason.title}</h3><p>{reason.body}</p></div>
            </article>
          ))}</div>
        </section>

        <section className={styles.howSection}>
          <h2>You bring curiosity. Dyad handles the first move.</h2>
          <div className={styles.stepList}>{steps.map(([number, title, body]) => (
            <article className={styles.step} key={number}>
              <span className={number === "2" ? styles.aquaStep : undefined}>{number}</span>
              <div><h3>{title}</h3><p>{body}</p></div>
            </article>
          ))}</div>
        </section>

        <footer className={styles.landingFooter}>
          <div className={styles.footerRing} />
          <h2>Your next friendship might already have a start time.</h2>
          <Link className={styles.aquaPill} href="/signup">Find something to do</Link>
          <div className={styles.footerMeta}><Logo /><span>© 2026 Dyad</span></div>
        </footer>
      </div>
    </main>
  );
}
