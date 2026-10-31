import Image from "next/image";
import { cn } from "@/lib/utils";

/** The shared decorative mark; surrounding text/link supplies the accessible name. */
export function TacklyMark({ size = 32, className }: { size?: number; className?: string }) {
  return <Image src="/brand/tackly-mark.svg" alt="" aria-hidden="true" width={size} height={size}
    draggable={false} unoptimized className={cn("shrink-0", className)} data-testid="tackly-mark" />;
}
