"use client";

export type AppMode = "real" | "demo";

const APP_MODE_KEY = "dyad-app-mode";

export function getAppMode(): AppMode | null {
  const value = window.sessionStorage.getItem(APP_MODE_KEY);
  if (value === "real" || value === "demo") return value;
  const cookieValue = document.cookie.split("; ").find((item) => item.startsWith(`${APP_MODE_KEY}=`))?.split("=")[1];
  if (cookieValue === "real" || cookieValue === "demo") {
    window.sessionStorage.setItem(APP_MODE_KEY, cookieValue);
    return cookieValue;
  }
  return null;
}

export function setAppMode(mode: AppMode) {
  window.sessionStorage.setItem(APP_MODE_KEY, mode);
  document.cookie = `${APP_MODE_KEY}=${mode}; Path=/; SameSite=Lax`;
}

export function startDemoSession() {
  setAppMode("demo");
}

export function startRealSession() {
  setAppMode("real");
}
