"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "../../dyad.module.css";
import SmartBackButton from "../../smart-back-button";
import { getAppMode, startRealSession } from "@/lib/app-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      if (getAppMode() === "demo") {
        const stored = sessionStorage.getItem("dyad-profile");
        if (stored) {
          const profile = JSON.parse(stored) as { name?: string; age?: number };
          if (active) {
            setName(profile.name ?? "");
            setAge(profile.age ? String(profile.age) : "");
          }
        }
        if (active) setLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
      if (!supabase || !user) {
        router.replace("/signup");
        return;
      }
      startRealSession();
      const { data } = await supabase.from("profiles").select("display_name, age").eq("id", user.id).maybeSingle();
      if (active && data) {
        setName(data.display_name ?? "");
        setAge(data.age ? String(data.age) : "");
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  const numericAge = Number(age);
  const valid = name.trim().length >= 2 && numericAge >= 18 && numericAge <= 120;

  async function saveAndContinue() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");

    if (getAppMode() === "demo") {
      const previous = JSON.parse(sessionStorage.getItem("dyad-profile") ?? "{}") as Record<string, unknown>;
      sessionStorage.setItem("dyad-profile", JSON.stringify({ ...previous, name: name.trim(), age: numericAge }));
      router.push("/onboarding/location");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: saveError } = supabase
      ? await supabase.rpc("set_my_profile_details", { p_display_name: name.trim(), p_age: numericAge })
      : { error: new Error("Supabase is not configured") };
    if (saveError) {
      setError("We couldn’t save those details. Please try again.");
      setSaving(false);
      return;
    }
    router.push("/onboarding/location");
  }

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.onboardingPage}`}>
        <header className={styles.onboardingHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/onboarding/interests" label="Back to interests" />
          <Logo />
          <span className={styles.onboardingStep}>2 of 3</span>
        </header>
        <div className={styles.onboardingProgress} aria-label="Onboarding progress: step 2 of 3"><span style={{ width: "66.667%" }} /></div>

        <div className={`${styles.onboardingBody} ${styles.profileOnboardingBody}`}>
          <p className={styles.eyebrow}>A quick introduction</p>
          <h1>What should people call you?</h1>
          <p className={styles.onboardingLead}>Your preferred name appears on your profile. Your age is saved to your account but won’t be shown in Discovery.</p>
          <div className={styles.settingsForm}>
            <label><span>Preferred name</span><input autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sam" /></label>
            <label><span>Age</span><input inputMode="numeric" min={18} max={120} type="number" value={age} onChange={(event) => setAge(event.target.value)} placeholder="24" /></label>
          </div>
          {error ? <p className={styles.settingsError} role="alert">{error}</p> : null}
        </div>

        <footer className={styles.onboardingFooter}>
          <span>{valid ? "You’re all set" : "Both fields are required"}</span>
          <button className={styles.onboardingNext} type="button" onClick={() => void saveAndContinue()} disabled={!valid || loading || saving}>{saving ? "Saving…" : "Next"}<ArrowRight size={17} /></button>
        </footer>
      </section>
    </main>
  );
}

