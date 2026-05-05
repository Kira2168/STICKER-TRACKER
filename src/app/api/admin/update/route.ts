import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getAdminCookieName, verifyAdminSessionToken } from '../../../../lib/admin-session';

type UploadChanges = {
  agent_id?: string;
  agent_name?: string;
  plate_number?: string;
  driver_name?: string;
  driver_phone?: string;
  image_url?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!supabaseUrl) return jsonError('Missing NEXT_PUBLIC_SUPABASE_URL env var', 500);
  if (!serviceKey) return jsonError('Missing SUPABASE_SERVICE_ROLE_KEY env var', 500);

  const token = (await cookies()).get(getAdminCookieName())?.value || null;
  if (!token) return jsonError('Unauthorized', 401);
  const session = verifyAdminSessionToken(token);
  if (!session.ok) return jsonError('Unauthorized', 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { id, changes } = body as { id?: string; changes?: UploadChanges };
    if (!id || !changes) return NextResponse.json({ error: 'Missing id or changes' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('sticker_uploads')
      .update(changes)
      .eq('id', id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
