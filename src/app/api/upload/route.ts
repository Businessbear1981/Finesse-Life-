import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {uploadObject} from '@/lib/r2';
import {UPLOAD_TYPES, memberUploadKey, resolveUploadType} from '@/lib/account';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/upload (multipart: file, type?) — member image upload to R2.
// `type` must be one of UPLOAD_TYPES (default "upload"); the key is always
// `<type>s/<session user id>/…`, so a client can't write outside its own namespace.
// Any client-sent userId field is ignored.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({error: 'Not authenticated.'}, {status: 401});
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const type = resolveUploadType(formData.get('type'));

    if (!(file instanceof File)) {
      return NextResponse.json({error: 'No file provided.'}, {status: 400});
    }

    if (!type) {
      return NextResponse.json({error: `Unknown upload type. Allowed: ${UPLOAD_TYPES.join(', ')}.`}, {status: 400});
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({error: 'Only JPEG, PNG, WebP, and GIF are allowed.'}, {status: 415});
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({error: 'File exceeds 5 MB limit.'}, {status: 413});
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const key = memberUploadKey(type, user.id, ext);

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadObject(key, buffer, file.type);

    return NextResponse.json({url});
  } catch (err) {
    console.error('[upload] error:', err);
    return NextResponse.json({error: 'Upload failed.'}, {status: 500});
  }
}
