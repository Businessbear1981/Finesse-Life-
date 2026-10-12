import {guardExpensive} from '@/lib/api-guard';
import {NextResponse} from 'next/server';
// POST { box_id: string }
// Returns { reserved: true, confirmation: string }
export async function POST() {
  const me = await guardExpensive('stylist/reserve', 10);
  if (me instanceof NextResponse) return me;
  return Response.json({
    reserved: true,
    confirmation: "Your box is reserved. We'll notify you when it ships.",
  });
}
