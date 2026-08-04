import 'server-only';

function getSupabaseConfig() {
  const url = (
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  ).replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Redeemer Supabase is not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    );
  }

  return { url, serviceRoleKey };
}

export async function supabaseRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Redeemer Supabase request failed (${response.status}): ${body.slice(0, 1_000)}`
    );
  }

  if (!body) {
    return undefined as T;
  }

  return JSON.parse(body) as T;
}
