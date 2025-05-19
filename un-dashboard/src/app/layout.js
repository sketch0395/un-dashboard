import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";
import { ScanHistoryProvider } from "./components/networkscanhistory";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "UN-Dashboard | Unified System Management",
  description: "A unified dashboard for monitoring and managing Docker containers, networks, and system performance.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <ScanHistoryProvider>
          {children}
        </ScanHistoryProvider>
      </body>
    </html>
  );
}
