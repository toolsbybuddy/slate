import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH /api/subtasks/[id] - Update a subtask
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: subtaskId } = await params;

  // Get subtask with issue info for audit
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('subtasks')
    .select('*, issues(id, project_id)')
    .eq('id', subtaskId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }
    updates.title = body.title.trim();
  }

  if (body.is_done !== undefined) {
    updates.is_done = Boolean(body.is_done);
  }

  if (body.position !== undefined) {
    updates.position = Number(body.position);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: subtask, error } = await supabaseAdmin
    .from('subtasks')
    .update(updates)
    .eq('id', subtaskId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  const issue = existing.issues as { id: string; project_id: string };
  await supabaseAdmin.from('audit_log').insert({
    project_id: issue.project_id,
    issue_id: issue.id,
    actor_id: auth.user.id,
    action: 'subtask_updated',
    details: { subtask_id: subtaskId, updates },
  });

  return NextResponse.json(subtask);
}

// DELETE /api/subtasks/[id] - Delete a subtask
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: subtaskId } = await params;

  // Get subtask with issue info for audit
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('subtasks')
    .select('*, issues(id, project_id)')
    .eq('id', subtaskId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('subtasks')
    .delete()
    .eq('id', subtaskId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  const issue = existing.issues as { id: string; project_id: string };
  await supabaseAdmin.from('audit_log').insert({
    project_id: issue.project_id,
    issue_id: issue.id,
    actor_id: auth.user.id,
    action: 'subtask_deleted',
    details: { subtask_id: subtaskId, title: existing.title },
  });

  return NextResponse.json({ success: true });
}
