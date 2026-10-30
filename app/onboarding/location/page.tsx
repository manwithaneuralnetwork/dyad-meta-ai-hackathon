"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MapPin, Navigation } from "lucide-react";
import styles from "../../dyad.module.css";
import SmartBackButton from "../../smart-back-button";
import { getAppMode } from "@/lib/app-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Coordinates = { latitude: number; longitude: number };

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function LocationPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "shared" | "denied" | "outside">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function shareLocation() {
    setStatus("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isSanDiegoArea(position.coords.latitude, position.coords.longitude)) {
          setCoordinates(null);
          setStatus("outside");
          return;
        }
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setStatus("shared");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function finish(addressOverride?: string) {
    const trimmedAddress = (addressOverride ?? address).trim();
    if (!coordinates && !trimmedAddress) {
      setError("Share your location or enter an address to continue.");
      return;
    }
    if (!coordinates && !isSanDiegoAddress(trimmedAddress)) {
      setError("For now, enter a San Diego County address to continue.");
      return;
    }

    setSaving(true);
    setError("");
    const location = coordinates
      ? { source: "gps" as const, latitude: coordinates.latitude, longitude: coordinates.longitude }
      : { source: "address" as const, address: trimmedAddress };

    if (getAppMode() === "demo") {
      window.sessionStorage.setItem("dyad-location", JSON.stringify({ ...location, searchRadiusMiles: 15 }));
      router.replace("/feed");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: saveError } = supabase
      ? await supabase.rpc("complete_my_onboarding", coordinates ? {
        p_source: location.source,
        p_latitude: coordinates.latitude,
        p_longitude: coordinates.longitude,
        p_search_radius_miles: 15,
      } : {
        p_source: location.source,
        p_address: trimmedAddress,
        p_search_radius_miles: 15,
      })
      : { error: new Error("Supabase is not configured") };

    if (saveError) {
      setError("We couldn’t save your location. Please try again.");
      setSaving(false);
      return;
    }

    router.replace("/feed");
    router.refresh();
  }

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.onboardingPage}`}>
        <header className={styles.onboardingHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/onboarding/profile" label="Back to profile details" />
          <Logo />
          <span className={styles.onboardingStep}>3 of 3</span>
        </header>
        <div className={`${styles.onboardingProgress} ${styles.onboardingProgressComplete}`} aria-label="Onboarding progress: step 3 of 3"><span /></div>

        <div className={`${styles.onboardingBody} ${styles.locationBody}`}>
          <p className={styles.eyebrow}>Keep it nearby</p>
          <h1>Where should we look?</h1>
          <p className={styles.onboardingLead}>We’ll use your location to surface activities and people close enough to actually meet.</p>

          <button className={`${styles.locationShareButton} ${status === "shared" ? styles.settingsSelectedCard : ""}`} type="button" onClick={shareLocation} disabled={status === "locating"}>
            <span>{status === "shared" ? <Check size={19} /> : <Navigation size={19} />}</span>
            <span><strong>{status === "shared" ? "Current location shared" : status === "locating" ? "Finding your location…" : "Use my current location"}</strong><small>We’ll ask for permission first</small></span>
            <ArrowRight size={18} />
          </button>
          {status === "denied" && <p className={styles.settingsError}>Location wasn’t available. Enter your address below instead.</p>}
          {status === "outside" && <p className={styles.settingsError}>Dyad is currently available in San Diego County. More cities are opening soon.</p>}

          <div className={styles.locationDivider}><span>OR</span></div>
          <label className={styles.locationField}>
            <span>Enter a San Diego street address</span>
            <span className={styles.locationInputWrap}><MapPin size={17} /><input type="text" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="9500 Gilman Dr, La Jolla, CA" /></span>
          </label>
          <p className={styles.locationNote}>Your precise location stays private. Other people will only see the city you choose.</p>
          <div className={styles.regionAvailability}>
            <p><strong>Available now</strong><span>San Diego County</span></p>
            <button className={styles.sanDiegoButton} type="button" onClick={() => void finish("9500 Gilman Dr, La Jolla, CA 92093")} disabled={saving}><MapPin size={16} /><span><strong>Continue with San Diego</strong><small>9500 Gilman Dr · 15-mile radius</small></span><ArrowRight size={17} /></button>
            <button className={styles.regionUnavailable} type="button" disabled><MapPin size={16} /><span><strong>Choose another region</strong><small>More cities are opening soon</small></span></button>
          </div>
          {error ? <p className={styles.settingsError} role="alert">{error}</p> : null}
        </div>

        <footer className={styles.onboardingFooter}>
          <span>That’s everything</span>
          <button className={styles.onboardingNext} type="button" onClick={() => void finish()} disabled={saving || (!coordinates && !address.trim())}>{saving ? "Saving…" : "Finish"}<ArrowRight size={17} /></button>
        </footer>
      </section>
    </main>
  );
}

function isSanDiegoArea(latitude: number, longitude: number) {
  return latitude >= 32.53 && latitude <= 33.51 && longitude >= -117.61 && longitude <= -116.08;
}

function isSanDiegoAddress(address: string) {
  return /san diego|la jolla|chula vista|el cajon|escondido|oceanside|carlsbad|encinitas|vista|san marcos|national city|coronado|poway|santee|lemon grove|imperial beach|\b(?:919|920|921)\d{2}\b/i.test(address);
}
