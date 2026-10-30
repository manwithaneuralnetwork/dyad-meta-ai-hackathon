import ActivityClient from "./activity-client";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ id?: string | string[]; company?: string | string[] }> }) {
  const params = await searchParams;
  const rawId = params.id;
  const activityId = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawCompany = params.company;
  const company = Array.isArray(rawCompany) ? rawCompany[0] : rawCompany;
  return <ActivityClient activityId={activityId ?? ""} openCompanyInitially={company === "1"} />;
}
