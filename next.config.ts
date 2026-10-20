import type { NextConfig } from 'next';
import {validatePublicKey} from './src/lib/env';
if(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)validatePublicKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default config;
