"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, X } from "lucide-react";
import styles from "../../dyad.module.css";
import SmartBackButton from "../../smart-back-button";
import { getAppMode, startRealSession } from "@/lib/app-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const tags = ["Live music", "Coffee", "City walks", "Museums", "Trying new food", "Creative workshops", "Outdoor movies", "Book clubs", "Casual sports", "Volunteering", "Photography", "Game nights"];

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function InterestsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toggleTag = (tag: string) => setSelected((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);

  useEffect(() => {
    let active = true;

    async function loadInterests() {
      if (getAppMode() === "demo") {
        const stored = window.sessionStorage.getItem("dyad-interests");
        if (active && stored) setSelected(JSON.parse(stored) as string[]);
        if (active) setLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
      if (!user || !supabase) {
        router.replace("/signup");
        return;
      }

      startRealSession();
      const { data, error: loadError } = await supabase
        .from("profile_interests")
        .select("interest")
        .eq("user_id", user.id);

      if (!active) return;
      if (loadError) setError("We couldn’t load your interests. You can still choose them again.");
      else setSelected(data.map((item) => item.interest));
      setLoading(false);
    }

    void loadInterests();
    return () => { active = false; };
  }, [router]);

  async function saveAndContinue() {
    if (selected.length < 5 || saving) return;
    setSaving(true);
    setError("");

    if (getAppMode() === "demo") {
      window.sessionStorage.setItem("dyad-interests", JSON.stringify(selected));
      router.push("/onboarding/location");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: saveError } = supabase
      ? await supabase.rpc("replace_my_interests", { p_interests: selected })
      : { error: new Error("Supabase is not configured") };

    if (saveError) {
      setError("We couldn’t save your interests. Please try again.");
      setSaving(false);
      return;
    }

    router.push("/onboarding/location");
  }

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.onboardingPage}`}>
        <header className={styles.onboardingHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/signup" label="Back to account setup" />
          <Logo />
          <span className={styles.onboardingStep}>1 of 2</span>
        </header>
        <div className={styles.onboardingProgress} aria-label="Onboarding progress: step 1 of 2"><span /></div>

        <div className={styles.onboardingBody}>
          <p className={styles.eyebrow}>Make it yours</p>
          <h1>What are you into?</h1>
          <p className={styles.onboardingLead}>Pick at least five. This helps us find plans you’d actually say yes to.</p>

          <section className={styles.selectedTagsSection}>
            <div className={styles.tagSectionHeading}><h2>Your picks</h2><span>{selected.length} selected</span></div>
            <div className={styles.selectedTags} aria-live="polite">
              {selected.length ? selected.map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}>{tag}<X size={13} aria-hidden="true" /></button>
              )) : <p>{loading ? "Loading your picks…" : "Tap a tag below to add it here."}</p>}
            </div>
          </section>

          <section className={styles.availableTagsSection}>
            <h2>Explore interests</h2>
            <div className={styles.availableTags}>
              {tags.filter((tag) => !selected.includes(tag)).map((tag) => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)} disabled={loading}><Plus size={13} aria-hidden="true" />{tag}</button>
              ))}
            </div>
          </section>
          {error ? <p className={styles.settingsError} role="alert">{error}</p> : null}
        </div>

        <footer className={styles.onboardingFooter}>
          <span>{selected.length < 5 ? `${5 - selected.length} more to go` : "Looking good"}</span>
          <button className={styles.onboardingNext} type="button" onClick={saveAndContinue} disabled={selected.length < 5 || loading || saving}>{saving ? "Saving…" : "Next"}<ArrowRight size={17} /></button>
        </footer>
      </section>
    </main>
  );
}
