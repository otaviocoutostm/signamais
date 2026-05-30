import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SignaMais — Gerenciamento de Fila',
  description: 'Plataforma completa de digital signage com gerenciamento de filas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
        <style>{`
          :root { --signa-navy: #002B5C; --signa-red: #FF0044; --signa-green: #00E85C; --signa-blue: #0055FF; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; }
          .btn-primary { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; text-decoration: none; cursor: pointer; border: none; color: white; transition: all 0.2s; background-color: var(--signa-red); }
          .btn-primary:hover { background-color: #cc0036; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255, 0, 68, 0.3); }
          input, select, button, textarea { font-family: inherit; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
