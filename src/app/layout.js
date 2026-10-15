import "./globals.css";
import "./liquid-glass.css";
import { AdminProvider } from "@/components/AdminProvider";

export const metadata = {
  title: "iCARE Room Reservation | FEU Institute of Technology",
  description:
    "See when the iCARE Audio-Visual Room and Training Room at FEU Institute of Technology are free, and request one.",
  keywords: ["room reservation", "FEU Tech", "iCARE", "AVR", "training room"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AdminProvider>{children}</AdminProvider>
      </body>
    </html>
  );
}
