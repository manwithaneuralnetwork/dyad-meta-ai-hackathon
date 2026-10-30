"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import styles from "../../dyad.module.css";
import SmartBackButton from "../../smart-back-button";
import { getAppMode, startRealSession } from "@/lib/app-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { listInterestTags } from "@/lib/activity-data";
import TagPicker from "../../tag-picker";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function InterestsPage() {
  const router = useRouter();
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInterests() {
      const tags = await listInterestTags();
      if (active) setAllTags(tags.map((tag) => tag.label));
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
      router.push("/onboarding/profile");
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

    router.push("/onboarding/profile");
  }

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.onboardingPage}`}>
        <header className={styles.onboardingHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/signup" label="Back to account setup" />
          <Logo />
          <span className={styles.onboardingStep}>1 of 3</span>
        </header>
        <div className={styles.onboardingProgress} aria-label="Onboarding progress: step 1 of 3"><span style={{ width: "33.333%" }} /></div>

        <div className={styles.onboardingBody}>
          <p className={styles.eyebrow}>Make it yours</p>
          <h1>What are you into?</h1>
          <p className={styles.onboardingLead}>Pick at least five. This helps us find plans you’d actually say yes to.</p>

          <TagPicker allTags={allTags} selected={selected} onChange={setSelected} loading={loading} />
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
