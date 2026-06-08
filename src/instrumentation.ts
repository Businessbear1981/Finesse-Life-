export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const tracker = await import('@middleware.io/node-apm');
    tracker.track({
      projectName: 'finesselife',
      serviceName: process.env.MW_SERVICE_NAME ?? 'finesselife',
      accessToken: process.env.MW_API_KEY,
      target: process.env.MW_TARGET,
    });
  }
}
