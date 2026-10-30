"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import styles from "../dyad.module.css";
import SmartBackButton from "../smart-back-button";
import { startDemoSession, startRealSession } from "@/lib/app-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Real accounts are not configured on this build. Demo mode still works.");
      setLoading(false);
      return;
    }

    const displayName = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "New member";
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSuccess("Check your email to confirm your account, then come back and log in.");
      setLoading(false);
      return;
    }

    startRealSession();
    router.replace("/onboarding/interests");
    router.refresh();
  }

  function handleDemo() {
    startDemoSession();
    router.push("/onboarding/interests");
  }

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

          <form className={styles.authForm} onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              <span>Password</span>
              <input type="password" name="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error ? <p className={styles.authError} role="alert">{error}</p> : null}
            {success ? <p className={styles.authSuccess} role="status">{success}</p> : null}
            <button className={styles.authPrimaryButton} type="submit" disabled={loading || Boolean(success)}>{loading ? "Creating account…" : "Continue"}<ArrowRight size={18} /></button>
          </form>

          <div className={styles.authDivider}><span>OR</span></div>
          <button className={styles.authDemoButton} type="button" onClick={handleDemo}><span>D</span>Continue as demo</button>
          <p className={styles.authDemoNote}>No account required · resets when this session ends</p>
          <p className={styles.accountSwitch}>Already have an account? <Link href="/login">Log in</Link></p>
        </div>
      </section>
    </main>
  );
}
