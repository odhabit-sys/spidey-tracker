import HangingSpidey from "@/components/HangingSpidey";
import SpiderInsignia from "@/components/SpiderInsignia";
import { SetDeviceStatus } from "@/components/device/DeviceStatus";
import CreateTrackerForm from "./CreateTrackerForm";

export default function HomePage() {
  return (
    <>
      <SetDeviceStatus text="SPIDEY • READY" />
      <SpiderInsignia />
      <div className="home">
        <HangingSpidey />
        <CreateTrackerForm />
      </div>
    </>
  );
}
