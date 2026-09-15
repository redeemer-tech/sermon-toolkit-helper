import { hasValidCronAuthorization } from '@/lib/cron-auth';
import { supabaseRequest } from '@/lib/supabase-rest';

type KeepaliveRow = {
  last_ping_at: string;
};

export async function GET(request: Request) {
  if (
    !hasValidCronAuthorization(
      request.headers.get('authorization'),
      process.env.CRON_SECRET
    )
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const lastPingAt = new Date().toISOString();
    const rows = await supabaseRequest<KeepaliveRow[]>(
      'project_keepalive?id=eq.daily&select=last_ping_at',
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ last_ping_at: lastPingAt }),
      }
    );

    if (!rows[0]) {
      throw new Error('The daily keepalive row is missing.');
    }

    return Response.json({ success: true, lastPingAt: rows[0].last_ping_at });
  } catch (error) {
    console.error('Supabase keepalive failed:', error);
    return Response.json({ error: 'Keepalive failed' }, { status: 500 });
  }
}
