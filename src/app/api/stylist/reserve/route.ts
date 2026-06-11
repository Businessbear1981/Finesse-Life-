// POST { box_id: string }
// Returns { reserved: true, confirmation: string }
export async function POST() {
  return Response.json({
    reserved: true,
    confirmation: "Your box is reserved. We'll notify you when it ships.",
  });
}
