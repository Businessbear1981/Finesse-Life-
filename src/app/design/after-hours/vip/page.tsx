import {VipPreview} from './vip-preview';

/**
 * /design/after-hours/vip — the VIP Room (and its private lift) with sample data. No database.
 * `?state=member|unlinked|empty` · `?lift=verify|enroll|not_entitled|expired|rate_limited|unavailable|signed_out`
 * The lift's API calls are answered by a local stub in this preview only.
 */
export default async function VipPreviewPage({searchParams}: {searchParams: Promise<{state?: string; lift?: string}>}) {
  const sp = await searchParams;
  return <VipPreview state={sp.state ?? 'member'} lift={sp.lift ?? 'verify'} />;
}
