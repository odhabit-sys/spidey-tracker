import CreatorTracker from "./CreatorTracker";

export default async function TrackerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <CreatorTracker sessionId={sessionId} />;
}
