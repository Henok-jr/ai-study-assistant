import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ items: [] });
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('id,title,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: tool } = await supabase
      .from('tool_activity')
      .select('tool,topic,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(2);

    const items: Array<{ kind: 'Chat' | 'Flashcards' | 'Quiz'; title: string; href: string }> = [];

    if (conv?.title) {
      items.push({ kind: 'Chat', title: conv.title, href: '/dashboard' });
    }

    for (const row of tool ?? []) {
      if (row.tool === 'flashcards') {
        items.push({ kind: 'Flashcards', title: row.topic, href: '/tools/flashcards' });
      } else if (row.tool === 'quiz') {
        items.push({ kind: 'Quiz', title: row.topic, href: '/tools/quiz' });
      }
    }

    // Ensure stable ordering Chat -> Flashcards -> Quiz if possible
    const order = new Map([['Chat', 0], ['Flashcards', 1], ['Quiz', 2]] as const);
    items.sort((a, b) => (order.get(a.kind) ?? 99) - (order.get(b.kind) ?? 99));

    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/activity] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
