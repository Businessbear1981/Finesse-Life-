// POST { box_id: string }
// No stylist/fulfilment partner is connected yet, so nothing can be reserved.
// Returns 501 { state: 'preview', message } — callers must not show "reserved".
export async function POST() {
  return Response.json(
    {
      state: 'preview',
      message: 'Reservations open when a stylist partner is connected.',
    },
    {status: 501},
  );
}
