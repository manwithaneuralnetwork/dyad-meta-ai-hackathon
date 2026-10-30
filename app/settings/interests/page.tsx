"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import SettingsShell from "../settings-shell";
import styles from "../../dyad.module.css";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { listInterestTags, resolveViewer, type Viewer } from "@/lib/activity-data";
import TagPicker from "../../tag-picker";

export default function InterestsSettingsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [viewer, setViewer] = useState<Viewer>({ kind: "anonymous" });

  useEffect(() => {
    void (async () => {
      const nextViewer = await resolveViewer();
      setViewer(nextViewer);
      setAllInterests((await listInterestTags()).map((tag) => tag.label));
      if (nextViewer.kind === "real") {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase!.from("profile_interests").select("interest").eq("user_id", nextViewer.userId).order("interest");
        setSelected(data?.map((item) => item.interest) ?? []);
      } else {
        const stored = sessionStorage.getItem("dyad-interests");
        if (stored) setSelected(JSON.parse(stored));
      }
    })();
  }, []);

  function updateSelected(next: string[]) {
    setSaved(false);
    setSelected(next);
  }

  async function save() {
    if (selected.length < 5) return;
    if (viewer.kind === "real") {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { error } = await supabase.rpc("replace_my_interests", { p_interests: selected });
      if (error) return;
    } else sessionStorage.setItem("dyad-interests", JSON.stringify(selected));
    setSaved(true);
  }

  const saveLabel = saved
    ? `Saved ${selected.length} interests`
    : selected.length >= 5
      ? `Save ${selected.length} interests`
      : `${selected.length}/5 picks`;

  return (
    <SettingsShell eyebrow="Discovery preferences" title="Interests">
      <p className={styles.settingsLead}>Choose what you’d genuinely be excited to do.</p>
      <TagPicker allTags={allInterests} selected={selected} onChange={updateSelected} selectedHeading="Your interests" availableHeading="Add more" />
      <button className={`${styles.settingsSaveButton} ${styles.interestsSaveButton}`} type="button" onClick={() => void save()} disabled={selected.length < 5}>
        {saved ? <><Check size={17} />{saveLabel}</> : saveLabel}
      </button>
    </SettingsShell>
  );
}
