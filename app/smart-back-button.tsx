"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function SmartBackButton({
  className,
  fallbackHref,
  label = "Go back",
  size = 21,
}: {
  className?: string;
  fallbackHref: string;
  label?: string;
  size?: number;
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return <button className={className} type="button" aria-label={label} onClick={goBack}><ArrowLeft size={size} /></button>;
}
