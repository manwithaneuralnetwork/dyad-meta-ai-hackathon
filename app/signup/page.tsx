import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "../dyad.module.css";
import SmartBackButton from "../smart-back-button";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function SignUpPage() {
  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.authPage}`}>
        <header className={styles.authHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/" label="Back to home" />
          <span />
        </header>

        <div className={styles.authBody}>
          <Link className={styles.authBrand} href="/" aria-label="Dyad home"><Logo /></Link>
          <p className={styles.eyebrow}>Create your account</p>
          <h1>Join Dyad</h1>
          <p className={styles.authLead}>Set up the basics. We’ll get to what you’re into next.</p>

          <form className={styles.authForm}>
            <label>
              <span>Email or username</span>
              <input type="text" name="identity" autoComplete="username" placeholder="you@example.com" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" name="password" autoComplete="new-password" placeholder="At least 8 characters" />
            </label>
            <Link className={styles.authPrimaryButton} href="/onboarding/interests" aria-label="Continue to interests">Continue<ArrowRight size={18} /></Link>
          </form>

          <div className={styles.authDivider}><span>OR</span></div>

          <button className={styles.authGoogleButton} type="button"><span>G</span>Continue with Google</button>
          <p className={styles.accountSwitch}>Already have an account? <Link href="/login">Log in</Link></p>
        </div>
      </section>
    </main>
  );
}
