import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EzUmrah CRM — Umrah & Hajj Agency Management',
  description:
    'Cloud CRM for Umrah and Hajj travel agencies: bookings, packages, flights, hotels, transport, ziyarah, visas, invoicing and documents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
