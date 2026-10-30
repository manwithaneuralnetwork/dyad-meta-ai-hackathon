"use client";

export type AppMode = "real" | "demo";

const APP_MODE_KEY = "dyad-app-mode";

export function getAppMode(): AppMode | null {
  const value = window.sessionStorage.getItem(APP_MODE_KEY);
  return value === "real" || value === "demo" ? value : null;
}

export function setAppMode(mode: AppMode) {
  window.sessionStorage.setItem(APP_MODE_KEY, mode);
}

export function startDemoSession() {
  setAppMode("demo");
}

export function startRealSession() {
  setAppMode("real");
}
