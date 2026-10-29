"use client";

import { useEffect, useState } from "react";

export function SessionProfileText({ field, fallback, quoted = false }: { field: "name" | "intro" | "bio"; fallback: string; quoted?: boolean }) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const stored = sessionStorage.getItem("dyad-profile");
    if (!stored) return;
    const profile = JSON.parse(stored) as Partial<Record<typeof field, string>>;
    if (profile[field]) setValue(profile[field]);
  }, [field]);

  return <>{quoted ? `“${value}”` : value}</>;
}

export function SessionInterests({ fallback }: { fallback: readonly string[] }) {
  const [interests, setInterests] = useState<readonly string[]>(fallback);

  useEffect(() => {
    const stored = sessionStorage.getItem("dyad-interests");
    if (stored) setInterests(JSON.parse(stored));
  }, []);

  return <>{interests.map((interest) => <span key={interest}>{interest}</span>)}</>;
}
