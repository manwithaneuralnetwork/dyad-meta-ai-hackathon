"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MapPin, Navigation } from "lucide-react";
import styles from "../../dyad.module.css";
import SmartBackButton from "../../smart-back-button";

function Logo() {
  return <span className={styles.logo}><span className={styles.logoMark}><span /></span><span>dyad</span></span>;
}

export default function LocationPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "locating" | "shared" | "denied">("idle");

  function shareLocation() {
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sessionStorage.setItem("dyad-location", JSON.stringify({ mode: "gps", latitude: position.coords.latitude, longitude: position.coords.longitude, distance: "15" }));
        setStatus("shared");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function finish() {
    if (status !== "shared" && address.trim()) sessionStorage.setItem("dyad-location", JSON.stringify({ mode: "address", address, distance: "15" }));
    router.push("/feed");
  }

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.onboardingPage}`}>
        <header className={styles.onboardingHeader}>
          <SmartBackButton className={styles.plainBackButton} fallbackHref="/onboarding/interests" label="Back to interests" />
          <Link href="/" aria-label="Dyad home"><Logo /></Link>
          <span className={styles.onboardingStep}>2 of 2</span>
        </header>
        <div className={`${styles.onboardingProgress} ${styles.onboardingProgressComplete}`} aria-label="Onboarding progress: step 2 of 2"><span /></div>

        <div className={`${styles.onboardingBody} ${styles.locationBody}`}>
          <p className={styles.eyebrow}>Keep it nearby</p>
          <h1>Where should we look?</h1>
          <p className={styles.onboardingLead}>We’ll use your location to surface activities and people close enough to actually meet.</p>

          <button className={`${styles.locationShareButton} ${status === "shared" ? styles.settingsSelectedCard : ""}`} type="button" onClick={shareLocation}>
            <span>{status === "shared" ? <Check size={19} /> : <Navigation size={19} />}</span>
            <span><strong>{status === "shared" ? "Current location shared" : status === "locating" ? "Finding your location…" : "Use my current location"}</strong><small>We’ll ask for permission first</small></span>
            <ArrowRight size={18} />
          </button>
          {status === "denied" && <p className={styles.settingsError}>Location wasn’t available. Enter your address below instead.</p>}

          <div className={styles.locationDivider}><span>OR</span></div>
          <label className={styles.locationField}>
            <span>Enter your street address</span>
            <span className={styles.locationInputWrap}><MapPin size={17} /><input type="text" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Main St, San Diego, CA" /></span>
          </label>
          <p className={styles.locationNote}>Your precise location stays private. Other people will only see the city you choose.</p>
        </div>

        <footer className={styles.onboardingFooter}>
          <span>That’s everything</span>
          <button className={styles.onboardingNext} type="button" onClick={finish}>Finish<ArrowRight size={17} /></button>
        </footer>
      </section>
    </main>
  );
}
