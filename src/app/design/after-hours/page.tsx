import {Preview} from './preview';

/** /design/after-hours — rooms in the After Hours language with sample data. `?room=lobby&state=member|signed_out|empty`. */
export default async function AfterHoursPreviewPage({searchParams}: {searchParams: Promise<{room?: string; state?: string; finish?: string}>}) {
  const sp = await searchParams;
  return <Preview room={sp.room ?? 'lobby'} state={sp.state ?? 'member'} finish={sp.finish} />;
}
