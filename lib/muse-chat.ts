export const MUSE_COOLDOWN_SECONDS = 60;
export const MUSE_CONTEXT_MESSAGE_COUNT = 12;
export const MUSE_REPLY_MAX_LENGTH = 320;

export function containsMuseMention(body: string) {
  return /(^|\s)@muse\b/i.test(body);
}

export function museUnavailableReply() {
  return "I hit a snag, but I’m still here. Tag @muse again in a minute and I’ll help with the plan.";
}

export function museCooldownReply() {
  return "I’m catching up—give me a minute, then tag @muse again.";
}
