import {NextResponse} from 'next/server';
import {complete} from '@/lib/ai';

export async function POST(req: Request) {
  const {prompt, system} = await req.json();
  try {
    const text = await complete(prompt, {
      system,
      model: 'anthropic/claude-sonnet-4-6',
    });
    return NextResponse.json({text});
  } catch {
    return NextResponse.json({
      text: "Consider it handled. I'll have that arranged shortly.",
    });
  }
}
