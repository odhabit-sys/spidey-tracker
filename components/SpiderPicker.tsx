"use client";

import PixelSprite from "./PixelSprite";
import { SPIDER_SPRITES } from "@/lib/spiderSprites";
import { SPIDER_IDS, SPIDER_LABELS, type SpiderId } from "@/lib/shared/spiders";

interface Props {
  value: SpiderId;
  onChange: (id: SpiderId) => void;
  /** Identity already used by the other participant (shown, not selectable). */
  taken?: SpiderId | null;
}

/** CHOOSE YOUR SPIDER: 4x2 grid of chunky pixel cards. */
export default function SpiderPicker({ value, onChange, taken = null }: Props) {
  return (
    <div className="spider-picker">
      <p className="spider-picker__title">
        <span className="spider-picker__led" aria-hidden /> CHOOSE YOUR SPIDER
        <span className="spider-picker__count" aria-hidden>
          {String(SPIDER_IDS.indexOf(value) + 1).padStart(2, "0")}/{String(SPIDER_IDS.length).padStart(2, "0")}
        </span>
      </p>
      <div className="spider-picker__grid" role="radiogroup" aria-label="Choose your Spider">
        {SPIDER_IDS.map((id) => {
          const isTaken = id === taken;
          const selected = id === value && !isTaken;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={isTaken}
              disabled={isTaken}
              className={`spider-card${selected ? " is-selected" : ""}${isTaken ? " is-taken" : ""}`}
              onClick={() => onChange(id)}
            >
              <PixelSprite sprite={SPIDER_SPRITES[id]} scale={2} />
              <span className="spider-card__label">{SPIDER_LABELS[id]}</span>
              {isTaken && <span className="spider-card__stamp">TAKEN</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
