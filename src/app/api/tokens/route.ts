import { authenticateRequest, apiError, apiSuccess, getServiceClient } from '@/lib/api-auth'
import { randomBytes } from 'crypto'

// GET /api/tokens - List your PATs
export async function GET(request: Request) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const supabase = getServiceClient()

  const { data: tokens, error: queryError } = await supabase
    .from('personal_access_tokens')
    .select('id, name, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (queryError) {
    return apiError(queryError.message, 500)
  }

  return apiSuccess(tokens)
}

// POST /api/tokens - Create a new PAT
export async function POST(request: Request) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  let body: { name?: string; user_id?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const { name, user_id } = body

  if (!name?.trim()) {
    return apiError('Token name is required', 400)
  }

  const supabase = getServiceClient()

  // If user_id is provided, check that it's a bot (only bots can have tokens created for them by others)
  // Or that the current user is creating a token for themselves
  let targetUserId = user.id

  if (user_id && user_id !== user.id) {
    // Verify target is a bot
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, is_bot')
      .eq('id', user_id)
      .single()

    if (targetError || !targetUser) {
      return apiError('Target user not found', 404)
    }

    if (!targetUser.is_bot) {
      return apiError('Can only create tokens for bots or yourself', 403)
    }

    targetUserId = user_id
  }

  // Generate a secure random token
  // Format: slat_<32 random bytes as hex>
  const tokenBytes = randomBytes(32)
  const token = `slat_${tokenBytes.toString('hex')}`

  // For simplicity, we store the token as-is (not hashed)
  // In production, you'd want to hash it with bcrypt
  // TODO: Implement proper token hashing
  const { data: pat, error: insertError } = await supabase
    .from('personal_access_tokens')
    .insert({
      user_id: targetUserId,
      token_hash: token, // In production, this should be bcrypt(token)
      name: name.trim(),
    })
    .select('id, name, created_at')
    .single()

  if (insertError) {
    return apiError(insertError.message, 500)
  }

  // Return the token - this is the only time it will be shown!
  return apiSuccess({
    ...pat,
    token, // Only returned on creation
    warning: 'Save this token now! It will not be shown again.',
  }, 201)
}

// DELETE /api/tokens - Delete a PAT (requires token ID in query params)
export async function DELETE(request: Request) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { searchParams } = new URL(request.url)
  const tokenId = searchParams.get('id')

  if (!tokenId) {
    return apiError('Token ID is required', 400)
  }

  const supabase = getServiceClient()

  // Verify token belongs to user (or user is deleting a bot's token)
  const { data: token, error: tokenError } = await supabase
    .from('personal_access_tokens')
    .select('id, user_id, user:users(is_bot)')
    .eq('id', tokenId)
    .single()

  if (tokenError || !token) {
    return apiError('Token not found', 404)
  }

  // Allow deletion if: user owns token, or token belongs to a bot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenUser = token.user as any
  const isBot = tokenUser?.is_bot || tokenUser?.[0]?.is_bot
  if (token.user_id !== user.id && !isBot) {
    return apiError('Cannot delete this token', 403)
  }

  const { error: deleteError } = await supabase
    .from('personal_access_tokens')
    .delete()
    .eq('id', tokenId)

  if (deleteError) {
    return apiError(deleteError.message, 500)
  }

  return apiSuccess({ deleted: true })
}
