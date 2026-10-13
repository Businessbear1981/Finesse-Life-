import {EntrancePreview} from './entrance-preview';

/** /design/after-hours/entrance?step=idle|typing|error|lockout|preview|opening|choose — the Entrance at each step, no API calls. */
export default async function EntrancePreviewPage({searchParams}: {searchParams: Promise<{step?: string}>}) {
  const sp = await searchParams;
  return <EntrancePreview step={sp.step ?? 'idle'} />;
}
