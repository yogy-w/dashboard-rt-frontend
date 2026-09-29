import './globals.css';

export const metadata = {
  title: 'Dashboard RT 05 RW 031',
  description: 'Dashboard Kas RT dan Jimpitan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}