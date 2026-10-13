import {ConciergeClient} from './concierge-client';
import {sanitizePrefill} from './nova-model';

// The Concierge (Nova). `?q=` only prefills the composer; it is never sent automatically.
export default async function ConciergePage({searchParams}: {searchParams: Promise<{q?: string | string[]}>}) {
  const {q} = await searchParams;
  return <ConciergeClient prefill={sanitizePrefill(Array.isArray(q) ? q[0] : q)} />;
}
