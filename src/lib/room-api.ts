import 'server-only';
import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import type {z} from 'zod';
import {createClient} from '@/lib/data/server';
import type {AuthUser, DataClient} from '@/lib/data/query';

type Ctx = {user: AuthUser; db: DataClient; trace: string};
type Handler = (req: Request, ctx: Ctx, params: Record<string, string>) => Promise<Response | unknown>;

/**
 * Atlas room API wrapper: server-side access (member session, RLS-bound client), a trace id on every
 * response (x-trace-id), and uniform errors. Handlers return a Response or a JSON-able value.
 */
export function memberRoute(h: Handler) {
  return async (req: Request, ctx: {params?: Promise<Record<string, string>>} = {}) => {
    const trace = req.headers.get('x-trace-id') ?? randomUUID();
    const db = await createClient();
    const {data: {user}} = await db.auth.getUser();
    if (!user) return NextResponse.json({error: 'Unauthorized', trace}, {status: 401, headers: {'x-trace-id': trace}});
    try {
      const out = await h(req, {user, db, trace}, (await ctx.params) ?? {});
      const res = out instanceof Response ? out : NextResponse.json(out);
      res.headers.set('x-trace-id', trace);
      return res;
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof HttpError ? e.message : 'internal error';
      if (status === 500) console.error(JSON.stringify({trace, error: String(e)}));
      return NextResponse.json({error: message, trace}, {status, headers: {'x-trace-id': trace}});
    }
  };
}

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export async function body<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const r = schema.safeParse(await req.json().catch(() => null));
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
}

export function must<T>(r: {data: T; error: {message: string} | null}, notFound = false): NonNullable<T> {
  if (r.error) throw new HttpError(r.error.message.includes('0 rows') ? 404 : 400, r.error.message);
  if (notFound && (r.data == null || (Array.isArray(r.data) && !r.data.length))) throw new HttpError(404, 'not found');
  return r.data as NonNullable<T>;
}
