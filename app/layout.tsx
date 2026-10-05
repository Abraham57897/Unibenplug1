import 'leaflet/dist/leaflet.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth';
import Header from '@/components/Header';
import RatingPrompt from '@/components/RatingPrompt';
import SetupNotice from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'UnibenPlug - Buy, Sell, Find Around UNIBEN',
  description: 'UnibenPlug - Buy, Sell, Find Around UNIBEN',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, colorScheme: 'light', themeColor: '#4B0E4B' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {!isSupabaseConfigured ? (
          <SetupNotice
            title="Supabase keys missing"
            detail="Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in the Vars settings, then run supabase/schema.sql once."
          />
        ) : (
        <AuthProvider>
          <Header />
          {children}
          <RatingPrompt />
        </AuthProvider>
        )}
      </body>
    </html>
  );
}
