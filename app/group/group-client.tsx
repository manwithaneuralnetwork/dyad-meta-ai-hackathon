"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, MessageCircle, RefreshCw, Send, Sparkles, Trash2 } from "lucide-react";
import styles from "../dyad.module.css";
import ChatHeader from "./chat-header";
import InvitePeopleSheet from "./invite-people-sheet";
import { activityLocation, resolveViewer, type Viewer } from "@/lib/activity-data";
import { getGroupDetail, leaveGroup, markGroupRead, respondToInvite, scrapGroup, sendGroupMessage, subscribeToGroupMessages, subscribeToGroupPresence, unsubscribeFromGroup, type GroupDetail, type GroupMessage } from "@/lib/group-data";
import type { GroupBrief } from "@/lib/group-brief";
import { containsMuseMention } from "@/lib/muse-chat";

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
  const [brief, setBrief] = useState<GroupBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [museThinking, setMuseThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!groupId) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    setError("");
    try {
      const nextViewer = await resolveViewer();
      const nextDetail = await getGroupDetail(groupId, nextViewer);
      setViewer(nextViewer);
      setDetail(nextDetail);
      if (nextDetail?.accepted) {
        await markGroupRead(groupId, nextViewer);
        window.dispatchEvent(new Event("dyad:notifications-changed"));
      }
    } catch {
      setError("This conversation couldn’t be loaded.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!detail?.accepted) return;
    const channel = subscribeToGroupMessages(groupId, (message) => {
      setDetail((current) => current ? { ...current, messages: current.messages.some((item) => item.id === message.id) ? current.messages : [...current.messages, message] } : current);
      void markGroupRead(groupId, viewer).then(() => window.dispatchEvent(new Event("dyad:notifications-changed")));
    });
    return () => unsubscribeFromGroup(channel);
  }, [detail?.accepted, groupId, viewer]);

  useEffect(() => {
    if (!detail) return;
    const channel = subscribeToGroupPresence(groupId, () => void load(true));
    return () => unsubscribeFromGroup(channel);
  }, [detail?.groupId, groupId, load]);

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
      if (response === "declined") router.replace("/inbox");
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
      if (containsMuseMention(body)) void requestMuseResponse(message.id);
    } catch (sendError) {
      setDraft(body);
      setError(sendError instanceof Error ? sendError.message : "Your message couldn’t be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function requestMuseResponse(triggerMessageId: string) {
    setMuseThinking(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/muse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerMessageId }),
      });
      const payload = await response.json() as { message?: GroupMessage; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "Muse couldn’t reply.");
      setDetail((current) => current ? {
        ...current,
        messages: current.messages.some((item) => item.id === payload.message?.id) ? current.messages : [...current.messages, payload.message!],
      } : current);
    } catch (museError) {
      setNotice(museError instanceof Error ? museError.message : "Muse couldn’t reply right now.");
    } finally {
      setMuseThinking(false);
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

  async function scrap() {
    if (!detail?.canScrap || !window.confirm("Close this group permanently? It will disappear from Chats.")) return;
    setBusy(true);
    setError("");
    try {
      await scrapGroup(groupId);
      router.replace("/chats");
      router.refresh();
    } catch {
      setError("This group couldn’t be closed right now.");
      setBusy(false);
    }
  }

  async function generateBrief() {
    if (briefLoading) return;
    setBriefLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/groups/${groupId}/brief`, { method: "POST" });
      const payload = await response.json() as { brief?: GroupBrief; error?: string };
      if (!response.ok || !payload.brief) throw new Error(payload.error || "The meetup brief couldn’t be created.");
      setBrief(payload.brief);
    } catch (briefError) {
      setError(briefError instanceof Error ? briefError.message : "The meetup brief couldn’t be created.");
    } finally {
      setBriefLoading(false);
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
              {brief ? (
                <section className={styles.aiBriefCard} aria-live="polite">
                  <div className={styles.aiBriefHeading}><span><Sparkles size={16} /></span><div><small>Planned with Meta AI</small><h2>{brief.title}</h2></div><button type="button" onClick={() => void generateBrief()} disabled={briefLoading} aria-label="Refresh meetup brief"><RefreshCw size={15} /></button></div>
                  <dl><div><dt>Meet</dt><dd>{brief.arrival}</dd></div><div><dt>Open with</dt><dd>{brief.opener}</dd></div><div><dt>Check in</dt><dd>{brief.checkIn}</dd></div></dl>
                  <p>Built from activity details only—private messages stay private.</p>
                </section>
              ) : (
                <section className={styles.aiBriefPrompt}>
                  <span><Sparkles size={18} /></span><div><strong>Make meeting up easier</strong><p>Meta AI can turn the activity details into a quick arrival plan and conversation starter.</p></div><button type="button" onClick={() => void generateBrief()} disabled={briefLoading}>{briefLoading ? "Planning…" : "Plan meetup"}</button>
                </section>
              )}
              {detail.canScrap ? (
                <section className={styles.scrapGroupCard}>
                  <span><Trash2 size={18} /></span>
                  <div><strong>Everyone passed this time</strong><p>All invitations were declined. Close this unused group to remove it permanently.</p></div>
                  <button type="button" disabled={busy} onClick={() => void scrap()}>{busy ? "Closing…" : "Close group"}</button>
                </section>
              ) : null}
              {timeline.map((item) => {
                if (item.kind === "notice") return <p className={item.id === "created" ? styles.chatNotice : styles.chatEvent} key={item.id}>{item.text}</p>;
                if (item.message.author_type === "muse") return (
                  <div className={`${styles.messageRow} ${styles.museMessageRow}`} key={item.id}>
                    <span className={`${styles.chatAvatar} ${styles.museAvatar}`}><Sparkles size={14} /></span>
                    <div className={styles.messageStack}>
                      <span className={`${styles.messageName} ${styles.museName}`}>Muse <em>Meta AI</em></span>
                      <p className={`${styles.messageBubble} ${styles.messageBubbleMuse}`}>{item.message.body}</p>
                      <time className={styles.messageTime}>{formatTime(item.at)}</time>
                    </div>
                  </div>
                );
                const own = viewer.kind === "real" && item.message.sender_id === viewer.userId;
                const profile = profileById.get(item.message.sender_id);
                if (own) return <div className={styles.messageRowOwn} key={item.id}><div><p className={`${styles.messageBubble} ${styles.messageBubbleOwn}`}>{item.message.body}</p><time className={`${styles.messageTime} ${styles.messageTimeOwn}`}>{formatTime(item.at)}</time></div></div>;
                return <div className={styles.messageRow} key={item.id}><Link className={styles.chatProfileLink} href={`/profile?person=${item.message.sender_id}`} aria-label={`View ${profile?.display_name || "member"} profile`}><span className={styles.chatAvatar}>{initials(profile?.display_name)}</span></Link><div className={styles.messageStack}><Link className={styles.messageName} href={`/profile?person=${item.message.sender_id}`}>{profile?.display_name || "Member"}</Link><p className={styles.messageBubble}>{item.message.body}</p><time className={styles.messageTime}>{formatTime(item.at)}</time></div></div>;
              })}
              {museThinking ? <div className={`${styles.messageRow} ${styles.museMessageRow}`} aria-live="polite"><span className={`${styles.chatAvatar} ${styles.museAvatar}`}><Sparkles size={14} /></span><div className={styles.messageStack}><span className={`${styles.messageName} ${styles.museName}`}>Muse <em>Meta AI</em></span><p className={`${styles.messageBubble} ${styles.messageBubbleMuse} ${styles.museTyping}`}>Thinking<span>…</span></p></div></div> : null}
              {error ? <p className={styles.pageError} role="alert">{error}</p> : null}
              {notice ? <p className={styles.chatNotice} role="status">{notice}</p> : null}
            </div>
            <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message · @muse for help" aria-label="Message the group" maxLength={2000} />
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
