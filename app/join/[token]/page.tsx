import JoinInvite from "./JoinInvite";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinInvite token={token} />;
}
