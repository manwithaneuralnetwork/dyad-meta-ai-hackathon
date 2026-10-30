import GroupClient from "./group-client";

export default async function GroupChatPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const raw = (await searchParams).id;
  return <GroupClient groupId={Array.isArray(raw) ? raw[0] ?? "" : raw ?? ""} />;
}
