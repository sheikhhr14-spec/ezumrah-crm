import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EzUmrah CRM — Umrah & Hajj Agency Management',
  description:
    'Cloud CRM for Umrah and Hajj travel agencies: bookings, packages, flights, hotels, transport, ziyarah, visas, invoicing and documents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
      <script
        dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }}
      />
      {children}
    </body>
    </html>
  );
}
