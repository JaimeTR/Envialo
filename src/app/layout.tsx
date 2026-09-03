import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const braze = localFont({
  src: "../fonts/Braze.otf",
  variable: "--font-braze",
});

export const metadata: Metadata = {
  title: "Envialo",
  description: "Comparte archivos en tu red local, sin nube. Devmark · desarrollado por JaimeTR.",
  icons: {
    icon: "/branding/envialo-icon-light.svg",
    shortcut: "/branding/envialo-icon-light.svg",
    apple: "/branding/envialo-icon-light.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#5050e1",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem("envialo-theme") || "system";
    var isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${poppins.variable} ${braze.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#0b0d13] text-slate-800 dark:text-slate-200 antialiased font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
