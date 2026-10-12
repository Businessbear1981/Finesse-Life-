import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';

export const metadata: Metadata = {
  title: 'Continental · Design',
  robots: {index: false, follow: false},
};

/**
 * Dev-only design showcase. In production it 404s unless DESIGN_PREVIEW=true.
 * `connection()` makes the check run per request instead of being baked in at build time.
 */
export default async function DesignLayout({children}: {children: React.ReactNode}) {
  await connection();
  if (process.env.NODE_ENV === 'production' && process.env.DESIGN_PREVIEW !== 'true') notFound();
  return <>{children}</>;
}
