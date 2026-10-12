import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import type { Metadata } from "next";
import { Providers } from "../src/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "Northstar — Service Studio",
  description:
    "Turn a clear brief into a confident proposal. An Eclipse full-stack demonstration with fictional company and sample data.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
