import { NextResponse } from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ exclusives: [] });
    }

    const { data, error } = await supabase
      .from('vip_exclusives')
      .select('id, title, brand, price_cents, pledged_cents, category, description, partner_logo')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[GET /api/registry/vip]', error);
      return NextResponse.json({ exclusives: [] });
    }

    return NextResponse.json({ exclusives: data ?? [] });
  } catch (err) {
    console.error('[GET /api/registry/vip] error:', err);
    return NextResponse.json({ exclusives: [] });
  }
}
