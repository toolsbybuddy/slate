import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/issues/[id]/labels - Get labels for an issue
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

  const { data: labels, error } = await supabaseAdmin
    .from('issue_labels')
    .select('label:labels(*)')
    .eq('issue_id', issueId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the response
  const flatLabels = labels?.map(il => il.label) || [];
  return NextResponse.json(flatLabels);
}

// POST /api/issues/[id]/labels - Add a label to an issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: issueId } = await params;
  const body = await request.json();
  const { label_id } = body;

  if (!label_id) {
    return NextResponse.json({ error: 'label_id is required' }, { status: 400 });
  }

  // Verify issue exists and get project_id for audit
  const { data: issue, error: issueError } = await supabaseAdmin
    .from('issues')
    .select('id, project_id')
    .eq('id', issueId)
    .single();

  if (issueError || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  // Verify label exists
  const { data: label, error: labelError } = await supabaseAdmin
    .from('labels')
    .select('id, name')
    .eq('id', label_id)
    .single();

  if (labelError || !label) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  // Check if already attached
  const { data: existing } = await supabaseAdmin
    .from('issue_labels')
    .select('issue_id')
    .eq('issue_id', issueId)
    .eq('label_id', label_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Label already attached to issue' }, { status: 409 });
  }

  // Attach label
  const { error } = await supabaseAdmin
    .from('issue_labels')
    .insert({ issue_id: issueId, label_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from('audit_log').insert({
    project_id: issue.project_id,
    issue_id: issueId,
    actor_id: auth.user.id,
    action: 'label_added',
    details: { label_id, label_name: label.name },
  });

  return NextResponse.json({ success: true, label }, { status: 201 });
}

// DELETE /api/issues/[id]/labels - Remove a label from an issue
// Accepts label_id as query param: DELETE /api/issues/[id]/labels?label_id=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: issueId } = await params;
  const { searchParams } = new URL(request.url);
  const labelId = searchParams.get('label_id');

  if (!labelId) {
    return NextResponse.json({ error: 'label_id query parameter is required' }, { status: 400 });
  }

  // Get issue and label info for audit
  const { data: issue } = await supabaseAdmin
    .from('issues')
    .select('id, project_id')
    .eq('id', issueId)
    .single();

  const { data: label } = await supabaseAdmin
    .from('labels')
    .select('name')
    .eq('id', labelId)
    .single();

  // Remove the association
  const { error } = await supabaseAdmin
    .from('issue_labels')
    .delete()
    .eq('issue_id', issueId)
    .eq('label_id', labelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  if (issue) {
    await supabaseAdmin.from('audit_log').insert({
      project_id: issue.project_id,
      issue_id: issueId,
      actor_id: auth.user.id,
      action: 'label_removed',
      details: { label_id: labelId, label_name: label?.name },
    });
  }

  return NextResponse.json({ success: true });
}
