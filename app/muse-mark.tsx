import styles from "./dyad.module.css";

export default function MuseMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <span className={`${styles.museMark} ${className}`} style={{ width: size, height: size }} aria-hidden="true"><img className={styles.museMarkImage} src="/muse-logo.png" alt="" /></span>;
}
