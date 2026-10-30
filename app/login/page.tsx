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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Real accounts are not configured on this build. Demo mode still works.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(signInError?.message ?? "We could not log you in.");
      setLoading(false);
      return;
    }

    startRealSession();
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    router.replace(profile?.onboarding_completed ? "/feed" : "/onboarding/interests");
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
          <p className={styles.eyebrow}>Welcome back</p>
          <h1>Log in to Dyad</h1>

          <form className={styles.authForm} onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              <span>Password</span>
              <input type="password" name="password" autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error ? <p className={styles.authError} role="alert">{error}</p> : null}
            <button className={styles.authPrimaryButton} type="submit" disabled={loading}>{loading ? "Logging in…" : "Log in"}<ArrowRight size={18} /></button>
          </form>

          <div className={styles.authDivider}><span>OR</span></div>
          <button className={styles.authDemoButton} type="button" onClick={handleDemo}><span>D</span>Continue as demo</button>
          <p className={styles.authDemoNote}>No account required · resets when this session ends</p>
          <p className={styles.accountSwitch}>New to Dyad? <Link href="/signup">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
