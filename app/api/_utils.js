import { createSupabaseServerClient } from '../../lib/supabaseServer';

export function getAuthToken(req) {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  return auth.startsWith('Bearer ') ? auth : `Bearer ${auth}`;
}

export function getSupabaseClient(req) {
  const token = getAuthToken(req);
  if (!token) return null;
  return createSupabaseServerClient(token);
}

export function jsonOk(data) {
  return Response.json({ status: 'ok', data });
}

export function jsonError(message, code = 400) {
  return Response.json({ status: 'error', message }, { status: code });
}
