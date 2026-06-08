import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {FinesseLayout} from '@/components/finesse-layout';

export default async function HotelLayout({children}: {children: React.ReactNode}) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <FinesseLayout>{children}</FinesseLayout>;
}
