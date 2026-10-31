"use client";

import { useEffect, useState } from "react";
import { ArrowRight, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";
import styles from "./dyad.module.css";
import { activityLocation, formatActivityDate, listActivities, type ActivityRecord } from "@/lib/activity-data";

export default function LandingActivityShowcase() {
  const [activity, setActivity] = useState<ActivityRecord | null>(null);

  useEffect(() => {
    let active = true;
    void listActivities()
      .then((activities) => {
        if (active) setActivity(activities.find((item) => Boolean(item.image_url)) ?? activities[0] ?? null);
      })
      .catch(() => {
        // The fallback below keeps the landing page useful if the public catalog is unavailable.
      });
    return () => { active = false; };
  }, []);

  const title = activity?.title ?? "Your next plan starts nearby";
  const location = activity ? activityLocation(activity) : "San Diego";
  const href = activity ? `/activity?id=${activity.id}` : "/signup";

  return (
    <section className={styles.landingShowcase} aria-label="A real activity on Dyad">
      {activity?.image_url ? <img className={styles.showcaseImage} src={activity.image_url} alt="" /> : <div className={styles.showcaseFallback} aria-hidden="true" />}
      <div className={styles.showcaseShade} />
      <div className={styles.showcaseTopline}><span>On Dyad now</span><span>San Diego</span></div>
      <div className={styles.showcaseEvent}>
        <p>{activity ? formatActivityDate(activity.starts_at) : "A plan worth leaving the group chat for"}</p>
        <h2>{title}</h2>
        <span><MapPin size={13} aria-hidden="true" />{location}</span>
      </div>
      <div className={styles.showcaseSocialCard}>
        <span className={styles.showcasePeople} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.showcaseSocialCopy}><strong>Interested?</strong><small>Find people who want to go too.</small></span>
        <Link href={href} aria-label={`See ${title}`}><UsersRound size={16} aria-hidden="true" /><ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
