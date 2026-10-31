import Link from "next/link";

import { TacklyMark } from "@/components/brand/tackly-mark";
import { AppBackground } from "@/components/shell/app-background";
import { DEFAULT_THEME_MODE, getTheme } from "@/config/themes";

/**
 * Layout for the signed-out pages.
 *
 * Shares the app's scenic background so signing in does not feel like leaving
 * the product for a form.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const theme = getTheme(DEFAULT_THEME_MODE);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <AppBackground settings={theme.background} />

      <Link
        href="/"
        className="relative z-[var(--z-board)] flex items-center gap-2.5 text-lg font-semibold tracking-tight"
      >
        <TacklyMark size={44} />
        Pinax Board
      </Link>

      <div className="relative z-[var(--z-board)] flex w-full justify-center">
        {children}
      </div>
    </div>
  );
}
