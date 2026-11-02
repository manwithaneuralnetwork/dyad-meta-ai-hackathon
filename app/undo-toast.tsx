"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import styles from "./dyad.module.css";

export default function UndoToast({ message, onUndo, onDismiss }: { message: string; onUndo: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 4_500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss]);

  return <div className={styles.undoToast} role="status"><span><Check size={14} />{message}</span><button type="button" onClick={onUndo}>Undo</button></div>;
}
