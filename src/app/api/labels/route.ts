import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/labels - List all labels
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: labels, error } = await supabaseAdmin
    .from('labels')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(labels);
}

// POST /api/labels - Create a new label
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Label name is required' }, { status: 400 });
  }

  // Check for duplicate name
  const { data: existing } = await supabaseAdmin
    .from('labels')
    .select('id')
    .ilike('name', name.trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Label with this name already exists' }, { status: 409 });
  }

  const { data: label, error } = await supabaseAdmin
    .from('labels')
    .insert({
      name: name.trim(),
      color: color || '#6366f1', // Default indigo
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(label, { status: 201 });
}
