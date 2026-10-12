import {ConciergePreview} from './preview';

/** /design/after-hours/concierge — Nova with sample data. `?state=chat|empty|sending|errors|setup|name`. */
export default async function ConciergePreviewPage({searchParams}: {searchParams: Promise<{state?: string}>}) {
  const sp = await searchParams;
  return <ConciergePreview state={sp.state ?? 'chat'} />;
}
