"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, MessageCircle, Send } from "lucide-react";
import styles from "../dyad.module.css";
import ChatHeader from "./chat-header";
import InvitePeopleSheet from "./invite-people-sheet";
import { activityLocation, resolveViewer, type Viewer } from "@/lib/activity-data";
import { getGroupDetail, leaveGroup, respondToInvite, sendGroupMessage, subscribeToGroupMessages, unsubscribeFromGroup, type GroupDetail, type GroupMessage } from "@/lib/group-data";

type TimelineItem =
  | { id: string; kind: "notice"; at: string; text: string }
  | { id: string; kind: "message"; at: string; message: GroupMessage };

export default function GroupClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [viewer, setViewer] = useState<Viewer>({ kind: "anonymous" });
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!groupId) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const nextViewer = await resolveViewer();
      setViewer(nextViewer);
      setDetail(await getGroupDetail(groupId, nextViewer));
    } catch {
      setError("This conversation couldn’t be loaded.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!detail?.accepted) return;
    const channel = subscribeToGroupMessages(groupId, (message) => {
      setDetail((current) => current ? { ...current, messages: current.messages.some((item) => item.id === message.id) ? current.messages : [...current.messages, message] } : current);
    });
    return () => unsubscribeFromGroup(channel);
  }, [detail?.accepted, groupId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [detail?.messages.length]);

  const profileById = useMemo(() => new Map(detail?.members.map((member) => [member.profile.id, member.profile]) ?? []), [detail?.members]);
  const timeline = useMemo<TimelineItem[]>(() => {
    if (!detail) return [];
    return [
      { id: "created", kind: "notice" as const, at: detail.createdAt, text: "This activity group was created." },
      ...detail.acceptedInvites.map((invite) => ({ id: `accepted-${invite.profile.id}`, kind: "notice" as const, at: invite.acceptedAt, text: `${invite.profile.display_name || "A member"} accepted the invite!` })),
      ...detail.messages.map((message) => ({ id: message.id, kind: "message" as const, at: message.created_at, message })),
    ].sort((left, right) => +new Date(left.at) - +new Date(right.at));
  }, [detail]);

  async function respond(response: "accepted" | "declined") {
    setBusy(true);
    setError("");
    try {
      await respondToInvite(groupId, response);
      if (response === "declined") router.replace("/chats");
      else await load();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "That invitation couldn’t be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!draft.trim() || viewer.kind !== "real") return;
    const body = draft.trim();
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const message = await sendGroupMessage(groupId, viewer.userId, body);
      setDetail((current) => current ? { ...current, messages: current.messages.some((item) => item.id === message.id) ? current.messages : [...current.messages, message] } : current);
    } catch (sendError) {
      setDraft(body);
      setError(sendError instanceof Error ? sendError.message : "Your message couldn’t be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (viewer.kind !== "real") return;
    setBusy(true);
    try {
      await leaveGroup(groupId, viewer.userId);
      router.replace("/chats");
    } catch {
      setError("You couldn’t leave this group right now.");
      setBusy(false);
    }
  }

  if (loading) return <GroupEmpty title="Loading conversation…" />;
  if (!detail) return <GroupEmpty title="Conversation not found" body={error || "It may have been removed or you may no longer have access."} />;

  const subtitle = `${detail.members.length} ${detail.members.length === 1 ? "member" : "members"} · ${new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(detail.activity.starts_at))}`;

  return (
    <main className={styles.pageBackdrop}>
      <section className={`${styles.mobilePage} ${styles.groupPage}`}>
        <ChatHeader activityHref={`/activity?id=${detail.activity.id}`} backHref="/chats" direct={false} imageLabel="" location={activityLocation(detail.activity)} onInvite={() => setInviteOpen(true)} onLeave={() => void leave()} subtitle={subtitle} title={detail.activity.title} />
        {!detail.accepted ? (
          <section className={styles.groupInviteState}>
            <span className={styles.emptyStateIcon}><MessageCircle size={22} /></span>
            <p className={styles.eyebrow}>Activity invitation</p>
            <h1>Join the group?</h1>
            <p>You’ve been invited to plan {detail.activity.title} together.</p>
            {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
            <div><button type="button" disabled={busy} onClick={() => void respond("declined")}>Not now</button><button type="button" disabled={busy} onClick={() => void respond("accepted")}>{busy ? "Joining…" : "Accept invite"}</button></div>
          </section>
        ) : (
          <>
            <div className={styles.chatScroll} ref={scrollRef}>
              <p className={styles.chatDay}>Conversation</p>
              {timeline.map((item) => {
                if (item.kind === "notice") return <p className={item.id === "created" ? styles.chatNotice : styles.chatEvent} key={item.id}>{item.text}</p>;
                const own = viewer.kind === "real" && item.message.sender_id === viewer.userId;
                const profile = profileById.get(item.message.sender_id);
                if (own) return <div className={styles.messageRowOwn} key={item.id}><div><p className={`${styles.messageBubble} ${styles.messageBubbleOwn}`}>{item.message.body}</p><time className={`${styles.messageTime} ${styles.messageTimeOwn}`}>{formatTime(item.at)}</time></div></div>;
                return <div className={styles.messageRow} key={item.id}><span className={styles.chatAvatar}>{initials(profile?.display_name)}</span><div className={styles.messageStack}><span className={styles.messageName}>{profile?.display_name || "Member"}</span><p className={styles.messageBubble}>{item.message.body}</p><time className={styles.messageTime}>{formatTime(item.at)}</time></div></div>;
              })}
              {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
              {notice ? <p className={styles.chatNotice} role="status">{notice}</p> : null}
            </div>
            <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message the group" aria-label="Message the group" maxLength={2000} />
              <button className={styles.sendButton} type="submit" disabled={busy || !draft.trim()} aria-label="Send message"><Send size={18} /></button>
            </form>
          </>
        )}
        <InvitePeopleSheet activity={detail.activity} groupId={detail.groupId} memberIds={detail.members.map((member) => member.profile.id)} onClose={() => setInviteOpen(false)} onInvited={(count) => setNotice(`${count} ${count === 1 ? "invitation" : "invitations"} sent.`)} open={inviteOpen} viewer={viewer} />
      </section>
    </main>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function initials(name?: string) {
  return (name || "M").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function GroupEmpty({ title, body }: { title: string; body?: string }) {
  return <main className={styles.pageBackdrop}><section className={`${styles.mobilePage} ${styles.groupPage}`}><section className={styles.emptyState}><span className={styles.emptyStateIcon}><MessageCircle size={22} /></span><h1>{title}</h1>{body ? <p>{body}</p> : null}<Link href="/feed"><Compass size={15} />Explore Discovery</Link></section></section></main>;
}
