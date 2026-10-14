import PixelSprite from "./PixelSprite";
import { MASK } from "@/lib/sprites";

export default function PixelHeader() {
  return (
    <header className="pixel-header px-border">
      <span className="pixel-header__bracket">[</span>
      <span className="pixel-header__word--red">SPIDEY</span>
      <PixelSprite sprite={MASK} scale={2} title="Spidey mask" />
      <span>TRACKER</span>
      <span className="pixel-header__bracket">]</span>
    </header>
  );
}
