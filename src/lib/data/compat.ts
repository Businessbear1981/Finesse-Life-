/* eslint-disable @typescript-eslint/no-explicit-any -- dynamic, Supabase-compatible query surface */
import 'server-only';
// Drop-in for the call sites that used createServerClient/createClient from @supabase/*:
// the URL argument is ignored, the role argument decides member (RLS) vs service access.
import type { DataClient, QueryBuilder, AuthApi } from './query';
import { createClient as memberClient } from './server';
import { createServiceClient } from './service';

export const FINESSE_API = 'finesse-api';
export const MEMBER_ROLE = 'member' as const;
export const SERVICE_ROLE = 'service' as const;
type Role = string; // MEMBER_ROLE or SERVICE_ROLE

class LazyClient {
  private c: Promise<DataClient>;
  constructor(role: Role) { this.c = role === SERVICE_ROLE ? Promise.resolve(createServiceClient()) : memberClient(); }
  from<T = any[]>(table: string): QueryBuilder<T> {
    // QueryBuilder is thenable; defer construction until the member token is resolved.
    const c = this.c;
    const target: any = { _ops: [] as [string, unknown[]][] };
    const proxy: any = new Proxy(target, {
      get(t, prop: string) {
        if (prop === 'then') {
          return (ok: any, fail: any) => c.then((client) => {
            let qb: any = client.from(table);
            for (const [m, args] of t._ops) qb = qb[m](...args);
            return qb;
          }).then(ok, fail);
        }
        return (...args: unknown[]) => { t._ops.push([prop, args]); return proxy; };
      },
    });
    return proxy;
  }
  get auth(): Required<AuthApi> {
    const c = this.c;
    return {
      getUser: () => c.then((x) => x.auth.getUser()),
      getSession: () => c.then((x) => x.auth.getSession?.() ?? { data: { session: null }, error: null }) as ReturnType<Required<AuthApi>['getSession']>,
    };
  }
}

/** Legacy cookie/auth options are accepted for source compatibility and ignored (WorkOS owns the session cookie). */
type Opts = {
  cookies?: { getAll?: () => unknown; setAll?: (c: { name: string; value: string; options?: Record<string, unknown> }[]) => void };
  auth?: Record<string, unknown>;
};
export function createServerClient(_url: string | undefined, role: Role | undefined, _opts?: Opts): LazyClient { return new LazyClient(role ?? MEMBER_ROLE); }
export function createClient(_url: string | undefined, role: Role | undefined, _opts?: Opts): LazyClient { return new LazyClient(role ?? MEMBER_ROLE); }
export type { LazyClient };
