import './globals.css';

export const metadata = {
  title: 'Min värld',
  description: 'Filma ett bygge, lägg till det i din värld, och gå runt i den.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
