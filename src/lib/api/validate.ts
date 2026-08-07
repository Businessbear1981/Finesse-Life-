import {NextResponse} from 'next/server';
import type {ZodType} from 'zod';

// Shared request-body validator for API routes — .cursor/rules/project-security.mdc
// rule 2 requires Zod validation at every API boundary. Routes previously cast
// req.json() straight to an interface with no runtime check.
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{data: T; error?: undefined} | {data?: undefined; error: NextResponse}> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {error: NextResponse.json({error: 'Invalid JSON body.'}, {status: 400})};
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      error: NextResponse.json(
        {error: 'Invalid request.', issues: result.error.issues.map(i => ({path: i.path.join('.'), message: i.message}))},
        {status: 400},
      ),
    };
  }
  return {data: result.data};
}
