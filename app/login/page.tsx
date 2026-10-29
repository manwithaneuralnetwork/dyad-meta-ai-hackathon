import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "../dyad.module.css";
import SmartBackButton from "../smart-back-button";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function LoginPage() {
  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.authPage}`}>
        <header className={styles.authHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/" label="Back to home" />
          <span />
        </header>

        <div className={styles.authBody}>
          <Link className={styles.authBrand} href="/" aria-label="Dyad home"><Logo /></Link>
          <p className={styles.eyebrow}>Welcome back</p>
          <h1>Log in to Dyad</h1>

          <form className={styles.authForm}>
            <label>
              <span>Email or username</span>
              <input type="text" name="identity" autoComplete="username" placeholder="you@example.com" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" name="password" autoComplete="current-password" placeholder="Enter your password" />
            </label>
            <Link className={styles.authPrimaryButton} href="/feed" aria-label="Log in and continue to Discovery">Log in<ArrowRight size={18} /></Link>
          </form>

          <div className={styles.authDivider}><span>OR</span></div>
          <Link className={styles.authDemoButton} href="/onboarding/interests"><span>D</span>Continue as demo</Link>
          <p className={styles.authDemoNote}>No account required · resets when this session ends</p>
          <p className={styles.accountSwitch}>New to Dyad? <Link href="/signup">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
