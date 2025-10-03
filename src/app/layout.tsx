import type { Metadata } from "next";
import "./globals.css";
import "./lib/envSetup";
import { Providers } from "./providers";
import { activeThemeVariables } from "../theme/palette";

export const metadata: Metadata = {
  title: "Dexter Beta",
  description: "Dexter Beta – realtime trading copilots and MCP tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={activeThemeVariables}>
      <body className={`antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
