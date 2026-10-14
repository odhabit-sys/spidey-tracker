import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "screen" is the outlined pill control drawn on the display itself. */
  variant?: "paper" | "red" | "cyan" | "screen";
  size?: "large" | "small";
}

export default function PixelButton({ variant = "paper", size = "large", className, type = "button", ...rest }: Props) {
  const classes = ["pixel-btn", variant !== "paper" && `pixel-btn--${variant}`, size === "small" && "pixel-btn--small", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
