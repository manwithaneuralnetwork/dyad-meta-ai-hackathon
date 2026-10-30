"use client";

import { useEffect, useState } from "react";
import { Check, LocateFixed, MapPin } from "lucide-react";
import SettingsShell from "../settings-shell";
import styles from "../../dyad.module.css";

export default function LocationSettingsPage() {
  const [address, setAddress] = useState("");
  const [distance, setDistance] = useState("15");
  const [status, setStatus] = useState<"idle" | "locating" | "shared" | "denied" | "outside" | "saved">("idle");

  useEffect(() => {
    const stored = sessionStorage.getItem("dyad-location");
    if (!stored) return;
    const value = JSON.parse(stored);
    setAddress(value.address ?? "");
    setDistance(value.distance ?? "15");
    if (value.mode === "gps") setStatus("shared");
  }, []);

  function shareLocation() {
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isSanDiegoArea(position.coords.latitude, position.coords.longitude)) {
          setStatus("outside");
          return;
        }
        sessionStorage.setItem("dyad-location", JSON.stringify({ mode: "gps", latitude: position.coords.latitude, longitude: position.coords.longitude, distance }));
        setAddress("");
        setStatus("shared");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function saveAddress(addressOverride?: string) {
    const nextAddress = addressOverride ?? address;
    if (!isSanDiegoAddress(nextAddress)) {
      setStatus("outside");
      return;
    }
    setAddress(nextAddress);
    sessionStorage.setItem("dyad-location", JSON.stringify({ mode: "address", address: nextAddress, distance }));
    setStatus("saved");
  }

  return (
    <SettingsShell eyebrow="Discovery radius" title="Location & distance">
      <p className={styles.settingsLead}>Share your location for the best nearby results, or enter an address instead.</p>
      <button className={`${styles.locationShareButton} ${status === "shared" ? styles.settingsSelectedCard : ""}`} type="button" onClick={shareLocation}>
        <span>{status === "shared" ? <Check size={19} /> : <LocateFixed size={19} />}</span>
        <span><strong>{status === "shared" ? "Current location shared" : status === "locating" ? "Finding your location…" : "Share current location"}</strong><small>Only your city is shown to other people</small></span>
      </button>
      {status === "denied" && <p className={styles.settingsError}>Location wasn’t available. Enter an address below instead.</p>}
      {status === "outside" && <p className={styles.settingsError}>Dyad is currently available in San Diego County. More cities are opening soon.</p>}
      <div className={styles.regionAvailability}>
        <p><strong>Available now</strong><span>San Diego County</span></p>
        <button className={styles.sanDiegoButton} type="button" onClick={() => saveAddress("9500 Gilman Dr, La Jolla, CA 92093")}><MapPin size={16} /><span><strong>Use San Diego</strong><small>9500 Gilman Dr · {distance}-mile radius</small></span><Check size={17} /></button>
        <button className={styles.regionUnavailable} type="button" disabled><MapPin size={16} /><span><strong>Choose another region</strong><small>More cities are opening soon</small></span></button>
      </div>
      <div className={styles.locationDivider}><span>OR</span></div>
      <div className={styles.settingsForm}>
        <label><span>San Diego street address</span><span className={styles.locationInputWrap}><MapPin size={17} /><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="9500 Gilman Dr, La Jolla, CA" /></span></label>
        <label><span>Search distance</span><select value={distance} onChange={(event) => setDistance(event.target.value)}><option value="5">Within 5 miles</option><option value="15">Within 15 miles</option><option value="30">Within 30 miles</option><option value="50">Within 50 miles</option></select></label>
        <button className={styles.settingsSaveButton} type="button" disabled={!address.trim()} onClick={() => saveAddress()}>{status === "saved" ? <><Check size={17} />Address saved</> : "Use this address"}</button>
      </div>
    </SettingsShell>
  );
}

function isSanDiegoArea(latitude: number, longitude: number) {
  return latitude >= 32.53 && latitude <= 33.51 && longitude >= -117.61 && longitude <= -116.08;
}

function isSanDiegoAddress(address: string) {
  return /san diego|la jolla|chula vista|el cajon|escondido|oceanside|carlsbad|encinitas|vista|san marcos|national city|coronado|poway|santee|lemon grove|imperial beach|\b(?:919|920|921)\d{2}\b/i.test(address);
}
