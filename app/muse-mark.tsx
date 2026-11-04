import styles from "./dyad.module.css";

export default function MuseMark({ size = 18, className = "", tone = "light" }: { size?: number; className?: string; tone?: "light" | "dark" }) {
  return <span className={`${styles.museMark} ${tone === "dark" ? styles.museMarkOnDark : ""} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    <img className={styles.museMarkImage} src="/muse-logo.png" alt="" />
  </span>;
}
