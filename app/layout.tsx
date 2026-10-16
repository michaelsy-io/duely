import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import { themeDataAttrs, themeStyle } from "@/lib/themes";
import { getTheme } from "@/lib/themes/server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700", "800"] });
// Numbers, IDs, dates and eyebrow labels (from the duely design system: the mono/grotesque contrast is the receipt feel).
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "Duely", template: "%s · Duely" },
  description: "Collections, made friendly. Duely tells your collectors who to chase, which checks to deposit and what to say.",
};

export const viewport: Viewport = { themeColor: "#5B3FD0" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await getTheme();
  return (
    <html lang="en" {...themeDataAttrs(theme)} style={themeStyle(theme)} className={`${jakarta.variable} ${bricolage.variable} ${plexMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
