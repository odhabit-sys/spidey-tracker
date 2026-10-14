import HangingSpidey from "@/components/HangingSpidey";
import SpiderInsignia from "@/components/SpiderInsignia";
import CreateTrackerForm from "./CreateTrackerForm";

export default function HomePage() {
  return (
    <>
      <SpiderInsignia />
      <div className="home">
        <HangingSpidey />
        <CreateTrackerForm />
      </div>
    </>
  );
}
