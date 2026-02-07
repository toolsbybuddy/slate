import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/issues/[id]/subtasks - List subtasks for an issue
export async function GET(
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
    .select('id')
    .eq('id', issueId)
    .single();

  if (issueError || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const { data: subtasks, error } = await supabaseAdmin
    .from('subtasks')
    .select('*')
    .eq('issue_id', issueId)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(subtasks);
}

// POST /api/issues/[id]/subtasks - Create a new subtask
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: issueId } = await params;

  // Verify issue exists and get project_id for audit log
  const { data: issue, error: issueError } = await supabaseAdmin
    .from('issues')
    .select('id, project_id')
    .eq('id', issueId)
    .single();

  if (issueError || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const body = await request.json();
  const { title } = body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Get max position for this issue
  const { data: maxPos } = await supabaseAdmin
    .from('subtasks')
    .select('position')
    .eq('issue_id', issueId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const nextPosition = (maxPos?.position ?? -1) + 1;

  const { data: subtask, error } = await supabaseAdmin
    .from('subtasks')
    .insert({
      issue_id: issueId,
      title: title.trim(),
      position: nextPosition,
      is_done: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from('audit_log').insert({
    project_id: issue.project_id,
    issue_id: issueId,
    actor_id: auth.user.id,
    action: 'subtask_added',
    details: { subtask_id: subtask.id, title: subtask.title },
  });

  return NextResponse.json(subtask, { status: 201 });
}
