import { Inter } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/components/AdminProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "iCARE Room Reservation | FEU Institute of Technology",
  description:
    "Real-time room scheduling dashboard for FEU Institute of Technology. View and manage AVR and Study Area reservations.",
  keywords: ["room reservation", "FEU", "scheduling", "AVR", "study area"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AdminProvider>{children}</AdminProvider>
      </body>
    </html>
  );
}
