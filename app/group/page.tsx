import { Send } from "lucide-react";
import styles from "../dyad.module.css";
import ChatHeader from "./chat-header";

const directProfiles: Record<string, { initials: string; name: string }> = {
  maya: { initials: "MC", name: "Maya Chen" },
  eli: { initials: "EB", name: "Eli Brooks" },
  sofia: { initials: "SM", name: "Sofia Martin" },
  jordan: { initials: "JL", name: "Jordan Lee" },
  priya: { initials: "PS", name: "Priya Shah" },
  noah: { initials: "NW", name: "Noah Williams" },
  sam: { initials: "SL", name: "Sam Lee" },
};

export default async function GroupChatPage({ searchParams }: { searchParams: Promise<{ dm?: string | string[] }> }) {
  const rawDm = (await searchParams).dm;
  const dmKey = Array.isArray(rawDm) ? rawDm[0] : rawDm;
  const direct = dmKey ? directProfiles[dmKey] : undefined;

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.groupPage}`}>
        <ChatHeader
          backHref={direct ? `/profile?person=${dmKey}` : "/activity"}
          direct={Boolean(direct)}
          imageLabel={direct?.initials ?? ""}
          subtitle={direct ? "Active recently" : "4 members · Friday at 7:30 PM"}
          title={direct?.name ?? "Jazz in the Courtyard"}
        />

        <div className={styles.chatScroll} aria-label={direct ? `Conversation with ${direct.name}` : "Group conversation"}>
          <p className={styles.chatDay}>Today</p>
          {direct ? (
            <>
              <p className={styles.chatNotice}>You and {direct.name} are connected on Dyad.</p>
              <article className={styles.messageRow}>
                <span className={`${styles.chatAvatar} ${styles.chatAvatarAqua}`}>{direct.initials}</span>
                <div className={styles.messageStack}>
                  <span className={styles.messageName}>{direct.name.split(" ")[0]}</span>
                  <p className={styles.messageBubble}>Hey! Are you still thinking about the jazz event on Friday?</p>
                  <span className={styles.messageTime}>11:08 AM</span>
                </div>
              </article>
              <article className={styles.messageRowOwn}>
                <div className={styles.messageStack}>
                  <p className={`${styles.messageBubble} ${styles.messageBubbleOwn}`}>Definitely. I was actually about to ask if you wanted to meet there.</p>
                  <span className={`${styles.messageTime} ${styles.messageTimeOwn}`}>11:10 AM</span>
                </div>
              </article>
            </>
          ) : (
            <>
              <p className={styles.chatNotice}>You created this group for Jazz in the Courtyard.</p>
              <p className={styles.chatEvent}>Maya accepted the invite!</p>
              <article className={styles.messageRow}>
                <span className={`${styles.chatAvatar} ${styles.chatAvatarAqua}`}>MC</span>
                <div className={styles.messageStack}>
                  <span className={styles.messageName}>Maya</span>
                  <p className={styles.messageBubble}>Hey! Glad this came together. Is everyone thinking 7:15 by the entrance?</p>
                  <span className={styles.messageTime}>10:42 AM</span>
                </div>
              </article>

              <article className={styles.messageRowOwn}>
                <div className={styles.messageStack}>
                  <p className={`${styles.messageBubble} ${styles.messageBubbleOwn}`}>Works for me. I can grab a table if I get there first.</p>
                  <span className={`${styles.messageTime} ${styles.messageTimeOwn}`}>10:44 AM</span>
                </div>
              </article>

              <p className={styles.chatEvent}>Eli accepted the invite!</p>
              <article className={styles.messageRow}>
                <span className={styles.chatAvatar}>EB</span>
                <div className={styles.messageStack}>
                  <span className={styles.messageName}>Eli</span>
                  <p className={styles.messageBubble}>Perfect—I’ll be the one carrying a very unnecessary umbrella.</p>
                  <span className={styles.messageTime}>10:47 AM</span>
                </div>
              </article>

              <p className={styles.chatEvent}>Sofia accepted the invite!</p>
              <article className={styles.messageRow}>
                <span className={styles.chatAvatar}>SM</span>
                <div className={styles.messageStack}>
                  <span className={styles.messageName}>Sofia</span>
                  <p className={styles.messageBubble}>I’m in! New to the park, so a meeting pin would help.</p>
                  <span className={styles.messageTime}>10:51 AM</span>
                </div>
              </article>

              <article className={styles.messageRowOwn}>
                <div className={styles.messageStack}>
                  <p className={`${styles.messageBubble} ${styles.messageBubbleOwn}`}>I’ll drop one here before we head over.</p>
                  <span className={`${styles.messageTime} ${styles.messageTimeOwn}`}>10:53 AM</span>
                </div>
              </article>
            </>
          )}
        </div>

        <div className={styles.composer}>
          <input type="text" aria-label="Message" placeholder={direct ? `Message ${direct.name.split(" ")[0]}` : "Message the group"} />
          <button className={styles.sendButton} type="button" aria-label="Send message"><Send size={17} /></button>
        </div>
      </section>
    </main>
  );
}
