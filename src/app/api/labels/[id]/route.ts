import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/labels/[id] - Get a single label
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: label, error } = await supabaseAdmin
    .from('labels')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !label) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  return NextResponse.json(label);
}

// PATCH /api/labels/[id] - Update a label
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'Label name cannot be empty' }, { status: 400 });
    }
    
    // Check for duplicate name (excluding current label)
    const { data: existing } = await supabaseAdmin
      .from('labels')
      .select('id')
      .ilike('name', body.name.trim())
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Label with this name already exists' }, { status: 409 });
    }
    
    updates.name = body.name.trim();
  }

  if (body.color !== undefined) {
    updates.color = body.color;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: label, error } = await supabaseAdmin
    .from('labels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!label) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  return NextResponse.json(label);
}

// DELETE /api/labels/[id] - Delete a label
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Delete will cascade to issue_labels
  const { error } = await supabaseAdmin
    .from('labels')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
