import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/data/server';

export async function GET() {
  return NextResponse.json({user: await currentUser()});
}
