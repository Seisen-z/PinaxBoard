import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Providers } from "@/app/providers";
import { DEFAULT_THEME_MODE, getTheme } from "@/config/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tackly",
  icons: { icon: [{ url: "/brand/tackly-mark.svg", type: "image/svg+xml" }] },
  description:
    "A customizable to-do, sticky-note and digital notebook workspace.",
};

export const viewport: Viewport = {
  // Matches light mode's `--background`, which is what the server renders
  // before `localStorage` says whether this user chose dark.
  themeColor: "#f3f1ec",
  // Page zoom remains available. Canvas alone handles its own gestures via touch-action.
};

/**
 * Root layout.
 *
 * `data-theme` is rendered on the server from the default theme so the first
 * paint already carries the right token set — no flash of the wrong palette.
 * Milestone 19 swaps this for the user's stored preference.
 *
 * Geist ships as a local font package, so no network request is made for
 * typography at build or runtime (FRONTEND_SPEC.md §49).
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  const theme = getTheme(DEFAULT_THEME_MODE);

  return (
    <html
      lang="en"
      data-theme={theme.mode}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
