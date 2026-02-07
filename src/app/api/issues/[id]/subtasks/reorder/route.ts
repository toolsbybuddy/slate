import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/issues/[id]/subtasks/reorder - Reorder subtasks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: issueId } = await params;

  // Verify issue exists
  const { data: issue, error: issueError } = await supabaseAdmin
    .from('issues')
    .select('id, project_id')
    .eq('id', issueId)
    .single();

  if (issueError || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const body = await request.json();
  const { order } = body;

  // order should be an array of subtask IDs in the desired order
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'order must be an array of subtask IDs' }, { status: 400 });
  }

  // Update each subtask's position
  const updates = order.map((subtaskId: string, index: number) =>
    supabaseAdmin
      .from('subtasks')
      .update({ position: index })
      .eq('id', subtaskId)
      .eq('issue_id', issueId) // Ensure subtask belongs to this issue
  );

  await Promise.all(updates);

  // Fetch updated subtasks
  const { data: subtasks, error } = await supabaseAdmin
    .from('subtasks')
    .select('*')
    .eq('issue_id', issueId)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from('audit_log').insert({
    project_id: issue.project_id,
    issue_id: issueId,
    actor_id: auth.user.id,
    action: 'subtasks_reordered',
    details: { order },
  });

  return NextResponse.json(subtasks);
}
