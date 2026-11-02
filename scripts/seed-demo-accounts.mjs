import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase server configuration is missing.");

const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const seeds = [
  { email: "dyadacc03@mailinator.com", password: "dyadacc03", name: "Nina Patel", age: 24, oneLiner: "I’m happiest when a casual plan turns into a good story.", bio: "Curious about live music, art, and finding the best low-key spots in San Diego.", interests: ["Live music", "Museums", "Coffee"] },
  { email: "dyadacc04@mailinator.com", password: "dyadacc04", name: "Marcus Reed", age: 28, oneLiner: "Always up for trying something new with easygoing people.", bio: "Weekend explorer, amateur photographer, and enthusiastic workshop beginner.", interests: ["Photography", "Creative workshops", "City walks"] },
  { email: "dyadacc05@mailinator.com", password: "dyadacc05", name: "Zoe Kim", age: 23, oneLiner: "Give me good food, a walk, and people who actually show up.", bio: "UCSD grad student who likes outdoor plans, neighborhood food, and small friendly groups.", interests: ["Trying new food", "Outdoors", "City walks"] },
];

const { data: tagRows, error: tagError } = await supabase.from("interest_tags").select("label").eq("active", true);
if (tagError) throw tagError;
const availableTags = new Set(tagRows.map((row) => row.label));

const existingUsers = await listAllUsers();
for (const seed of seeds) {
  let user = existingUsers.find((candidate) => candidate.email?.toLowerCase() === seed.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email: seed.email, password: seed.password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    existingUsers.push(user);
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, { password: seed.password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: seed.name,
    age: seed.age,
    one_liner: seed.oneLiner,
    bio: seed.bio,
    city: "San Diego, CA",
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (profileError) throw profileError;

  const { error: locationError } = await supabase.from("user_locations").upsert({
    user_id: user.id,
    source: "address",
    address: "9500 Gilman Dr, La Jolla, CA 92093",
    search_radius_miles: 15,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (locationError) throw locationError;

  const interests = seed.interests.filter((interest) => availableTags.has(interest));
  const { error: deleteError } = await supabase.from("profile_interests").delete().eq("user_id", user.id);
  if (deleteError) throw deleteError;
  if (interests.length) {
    const { error: interestError } = await supabase.from("profile_interests").insert(interests.map((interest) => ({ user_id: user.id, interest })));
    if (interestError) throw interestError;
  }
}

const allUsers = await listAllUsers();
const demoUsers = allUsers.filter((user) => /^dyadacc\d+@mailinator\.com$/i.test(user.email || ""));
const { data: existingFriendships, error: friendshipReadError } = await supabase.from("friendships").select("id, requester_id, addressee_id, status");
if (friendshipReadError) throw friendshipReadError;
const existingPairs = new Map(existingFriendships.map((row) => [pairKey(row.requester_id, row.addressee_id), row]));
const friendshipRows = [];
const friendshipUpdateIds = [];
for (let left = 0; left < demoUsers.length; left += 1) {
  for (let right = left + 1; right < demoUsers.length; right += 1) {
    const requesterId = demoUsers[left].id < demoUsers[right].id ? demoUsers[left].id : demoUsers[right].id;
    const addresseeId = requesterId === demoUsers[left].id ? demoUsers[right].id : demoUsers[left].id;
    const existing = existingPairs.get(pairKey(requesterId, addresseeId));
    if (!existing) friendshipRows.push({ requester_id: requesterId, addressee_id: addresseeId, status: "accepted", responded_at: new Date().toISOString() });
    else if (existing.status !== "accepted") friendshipUpdateIds.push(existing.id);
  }
}
if (friendshipRows.length) {
  const { error } = await supabase.from("friendships").insert(friendshipRows);
  if (error) throw error;
}
if (friendshipUpdateIds.length) {
  const { error } = await supabase.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).in("id", friendshipUpdateIds);
  if (error) throw error;
}

console.log(`Seeded ${seeds.length} confirmed accounts and connected ${demoUsers.length} Dyad test accounts as Friends.`);

async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

function pairKey(left, right) {
  return [left, right].sort().join(":");
}
