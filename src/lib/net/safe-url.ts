// SSRF guard for operator-configurable or third-party-supplied outbound URLs
// (vendor api_base, health URLs, media result URLs). Rules follow the OWASP SSRF cheat sheet:
// https only, no credentials in the URL, no IP literals in private / loopback / link-local
// (incl. cloud metadata 169.254.169.254) / CGNAT / unique-local ranges, no localhost-style
// names, redirects not followed, optional host allowlist (exact host or subdomain).
import {isIP} from 'node:net';

export class UnsafeUrlError extends Error {}

function privateV4(ip: string): boolean {
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
function privateV6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === '::' || x === '::1') return true;
  if (x.startsWith('::ffff:')) { const v4 = x.slice(7); return isIP(v4) === 4 ? privateV4(v4) : true; }
  return /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith('ff');
}

export function assertSafeUrl(raw: string, allowHosts?: string[]): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new UnsafeUrlError('invalid URL'); }
  if (u.protocol !== 'https:') throw new UnsafeUrlError('https required');
  if (u.username || u.password) throw new UnsafeUrlError('credentials in URL not allowed');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const kind = isIP(host);
  if ((kind === 4 && privateV4(host)) || (kind === 6 && privateV6(host))) throw new UnsafeUrlError('private address not allowed');
  if (kind === 0 && (host === 'localhost' || /\.(localhost|local|internal|lan|home\.arpa)$/.test(host) || !host.includes('.'))) {
    throw new UnsafeUrlError('internal hostname not allowed');
  }
  if (allowHosts && !allowHosts.some((h) => host === h || host.endsWith('.' + h))) throw new UnsafeUrlError(`host ${host} not allowed`);
  return u;
}

/** fetch behind the SSRF guard; redirects are not followed (a 3xx to an internal host would bypass the check). */
export async function safeFetch(raw: string, init: RequestInit = {}, opts: {allowHosts?: string[]; timeoutMs?: number} = {}) {
  const u = assertSafeUrl(raw, opts.allowHosts);
  return fetch(u, {...init, redirect: 'manual', signal: init.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 10_000)});
}
