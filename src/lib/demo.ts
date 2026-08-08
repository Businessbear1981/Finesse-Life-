// Single switch for demo-theater content (placeholder market listings, the
// demo entrance PIN). Defaults ON so existing deploys are unchanged; set
// NEXT_PUBLIC_DEMO_MODE=false once real data replaces the mocks.
//
// NEXT_PUBLIC_* vars are inlined at build time — flipping the flag requires a
// redeploy, which is the point: demo content can't leak into a real build by
// accident at runtime.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
