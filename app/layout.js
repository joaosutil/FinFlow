import PWARegister from './components/PWARegister';

export const metadata = {
  title: 'FinFlow — Controle Financeiro',
  description: 'Controle financeiro completo com Supabase e Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/finflow.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0e1a" />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
