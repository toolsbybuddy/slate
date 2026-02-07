import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/issues/[id]/dependencies - Get dependencies for an issue
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

  // Get issues that block this one (this issue is blocked_id)
  const { data: blockedByData } = await supabaseAdmin
    .from('dependencies')
    .select(`
      blocker:issues!dependencies_blocker_id_fkey(
        id, number, title, status,
        project:projects(slug)
      )
    `)
    .eq('blocked_id', issueId);

  // Get issues that this one blocks (this issue is blocker_id)
  const { data: blockingData } = await supabaseAdmin
    .from('dependencies')
    .select(`
      blocked:issues!dependencies_blocked_id_fkey(
        id, number, title, status,
        project:projects(slug)
      )
    `)
    .eq('blocker_id', issueId);

  const blockedBy = blockedByData?.map((d: { blocker: unknown }) => d.blocker) || [];
  const blocking = blockingData?.map((d: { blocked: unknown }) => d.blocked) || [];

  return NextResponse.json({ blockedBy, blocking });
}

// POST /api/issues/[id]/dependencies - Add a dependency
// Body: { target_issue_id: string, type: 'blocks' | 'blocked_by' }
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
  const { target_issue_id, type } = body;

  if (!target_issue_id) {
    return NextResponse.json({ error: 'target_issue_id is required' }, { status: 400 });
  }

  if (!type || !['blocks', 'blocked_by'].includes(type)) {
    return NextResponse.json({ error: 'type must be "blocks" or "blocked_by"' }, { status: 400 });
  }

  // Verify both issues exist
  const { data: issue, error: issueError } = await supabaseAdmin
    .from('issues')
    .select('id, project_id, number')
    .eq('id', issueId)
    .single();

  if (issueError || !issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const { data: targetIssue, error: targetError } = await supabaseAdmin
    .from('issues')
    .select('id, number, title')
    .eq('id', target_issue_id)
    .single();

  if (targetError || !targetIssue) {
    return NextResponse.json({ error: 'Target issue not found' }, { status: 404 });
  }

  // Can't depend on self
  if (issueId === target_issue_id) {
    return NextResponse.json({ error: 'An issue cannot depend on itself' }, { status: 400 });
  }

  // Determine blocker and blocked based on type
  // type='blocks' means this issue blocks target (this is blocker)
  // type='blocked_by' means this issue is blocked by target (target is blocker)
  const blocker_id = type === 'blocks' ? issueId : target_issue_id;
  const blocked_id = type === 'blocks' ? target_issue_id : issueId;

  // Check if dependency already exists
  const { data: existing } = await supabaseAdmin
    .from('dependencies')
    .select('blocker_id')
    .eq('blocker_id', blocker_id)
    .eq('blocked_id', blocked_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 });
  }

  // Check for circular dependency (would the target already depend on this issue?)
  const { data: circular } = await supabaseAdmin
    .from('dependencies')
    .select('blocker_id')
    .eq('blocker_id', blocked_id)
    .eq('blocked_id', blocker_id)
    .single();

  if (circular) {
    return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
  }

  // Create dependency
  const { error: insertError } = await supabaseAdmin
    .from('dependencies')
    .insert({ blocker_id, blocked_id });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from('audit_log').insert({
    project_id: issue.project_id,
    issue_id: issueId,
    actor_id: auth.user.id,
    action: 'dependency_added',
    details: { 
      type,
      target_issue_id,
      target_issue_number: targetIssue.number,
      blocker_id,
      blocked_id
    },
  });

  return NextResponse.json({ 
    success: true, 
    dependency: { blocker_id, blocked_id, type }
  }, { status: 201 });
}

// DELETE /api/issues/[id]/dependencies - Remove a dependency
// Query params: target_issue_id, type ('blocks' | 'blocked_by')
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
  const targetIssueId = searchParams.get('target_issue_id');
  const type = searchParams.get('type');

  if (!targetIssueId) {
    return NextResponse.json({ error: 'target_issue_id query parameter is required' }, { status: 400 });
  }

  if (!type || !['blocks', 'blocked_by'].includes(type)) {
    return NextResponse.json({ error: 'type query parameter must be "blocks" or "blocked_by"' }, { status: 400 });
  }

  // Get issue for audit
  const { data: issue } = await supabaseAdmin
    .from('issues')
    .select('id, project_id')
    .eq('id', issueId)
    .single();

  // Determine blocker and blocked based on type
  const blocker_id = type === 'blocks' ? issueId : targetIssueId;
  const blocked_id = type === 'blocks' ? targetIssueId : issueId;

  // Remove the dependency
  const { error, count } = await supabaseAdmin
    .from('dependencies')
    .delete()
    .eq('blocker_id', blocker_id)
    .eq('blocked_id', blocked_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  if (issue) {
    await supabaseAdmin.from('audit_log').insert({
      project_id: issue.project_id,
      issue_id: issueId,
      actor_id: auth.user.id,
      action: 'dependency_removed',
      details: { type, target_issue_id: targetIssueId, blocker_id, blocked_id },
    });
  }

  return NextResponse.json({ success: true });
}
