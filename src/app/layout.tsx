import './globals.css';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'Dashboard RT 05 RW 031',
  description: 'Dashboard Kas RT, Jimpitan, dan Pemasukan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}