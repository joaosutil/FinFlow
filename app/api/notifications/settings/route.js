import { getUserOrThrow, jsonError, jsonOk } from '../../_utils';

const allowed = ['daily', 'weekly', 'monthly'];

export async function GET(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return jsonOk({ frequency: 'weekly' });
  return jsonOk({ frequency: data.frequency });
}

export async function PUT(req) {
  const { supabase, user, error, code } = await getUserOrThrow(req);
  if (error) return jsonError(error, code);

  const body = await req.json();
  const frequency = body.frequency;
  if (!allowed.includes(frequency)) return jsonError('Frequência inválida.');

  const { data } = await supabase
    .from('notification_settings')
    .upsert({ user_id: user.id, frequency }, { onConflict: 'user_id' })
    .select('*')
    .single();

  return jsonOk({ frequency: data.frequency });
}
