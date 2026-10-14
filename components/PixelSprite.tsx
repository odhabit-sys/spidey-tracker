import { spriteRuns, spriteSize, type Sprite } from "@/lib/sprites";

interface Props {
  sprite: Sprite;
  /** Size of one sprite pixel in CSS px. */
  scale?: number;
  className?: string;
  title?: string;
}

export default function PixelSprite({ sprite, scale = 3, className, title }: Props) {
  const { width, height } = spriteSize(sprite);
  return (
    <svg
      className={className}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {spriteRuns(sprite).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  );
}
