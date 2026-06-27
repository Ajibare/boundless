import { redirect } from 'next/navigation';

/**
 * The operational "Rewards" page was renamed to "Winners" (pick winners ->
 * announce -> pay). Keep this path as a permanent redirect so existing
 * bookmarks and links still resolve.
 */
export default async function RewardsRedirect({
  params,
}: {
  params: Promise<{ id: string; hackathonId: string }>;
}) {
  const { id, hackathonId } = await params;
  redirect(`/organizations/${id}/hackathons/${hackathonId}/winners`);
}
