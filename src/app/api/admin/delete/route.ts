import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!supabaseUrl) return jsonError('Missing NEXT_PUBLIC_SUPABASE_URL env var', 500);
  if (!serviceKey) return jsonError('Missing SUPABASE_SERVICE_ROLE_KEY env var', 500);

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { id } = body as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('sticker_uploads')
      .delete()
      .eq('id', id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
