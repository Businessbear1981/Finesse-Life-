import {NextResponse} from 'next/server';
import {FINESSE_API, MEMBER_ROLE, createServerClient} from '@/lib/data/compat';
import {cookies} from 'next/headers';
import {uploadObject} from '@/lib/r2';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const dbc = createServerClient(
      FINESSE_API,
      MEMBER_ROLE,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );

    const {
      data: {user},
    } = await dbc.auth.getUser();

    if (!user) {
      return NextResponse.json({error: 'Not authenticated.'}, {status: 401});
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) ?? 'upload';

    if (!file) {
      return NextResponse.json({error: 'No file provided.'}, {status: 400});
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({error: 'Only JPEG, PNG, WebP, and GIF are allowed.'}, {status: 415});
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({error: 'File exceeds 5 MB limit.'}, {status: 413});
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const key = `${type}s/${user.id}/${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadObject(key, buffer, file.type);

    return NextResponse.json({url});
  } catch (err) {
    console.error('[upload] error:', err);
    return NextResponse.json({error: 'Upload failed.'}, {status: 500});
  }
}
