import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/app/context/AuthContext';
import { NotificationProvider } from '@/app/context/NotificationContext';

export const metadata: Metadata = {
  title: 'SCS Equatorial',
  description: 'Sistema de Controle de Projetos SCS',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
