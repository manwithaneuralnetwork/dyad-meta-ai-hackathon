import ProfileClient from "./profile-client";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ person?: string | string[] }> }) {
  const raw = (await searchParams).person;
  return <ProfileClient requestedId={Array.isArray(raw) ? raw[0] : raw} />;
}
