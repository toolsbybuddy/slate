# Slate

**Bot-first issue tracking for small teams.**

Slate is a minimal, lightweight issue tracker designed for teams with AI assistants (bots) as first-class members. Unlike traditional issue trackers, Slate treats bots as real users with their own tasks, allowing seamless collaboration between humans and AI.

## Features

- **Kanban boards** — Visual project management with drag-and-drop
- **Bot-first design** — Bots are real users with API access via Personal Access Tokens
- **"Needs Attention" flag** — Ensure humans don't miss bot questions or blockers
- **Human-readable IDs** — Issues are `PROJECT-123`, not UUIDs
- **Labels** — Global, color-coded labels for organization
- **Activity feed** — Full audit trail powered by the audit log
- **Simple workflow** — Backlog → Ready → In Progress → Blocked → Done
- **Dependencies** — Track what blocks what
- **Subtasks** — Simple checklists per issue
- **Search** — Find issues across projects

## Tech Stack

- **Frontend:** Next.js 16 (App Router)
- **Backend:** Supabase (Auth + Postgres)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/toolsbybuddy/slate.git
cd slate
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the migration in `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Enable Google OAuth in Authentication → Providers
4. Add your domain to the redirect URLs

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Bot Setup

### 1. Create a bot user

Run in Supabase SQL editor:

```sql
INSERT INTO users (name, is_bot, avatar_url) 
VALUES ('Buddy', true, 'https://example.com/buddy-avatar.png');
```

### 2. Generate a Personal Access Token

(API endpoint coming soon — for now, create manually in the database)

### 3. Use the API

```bash
# List projects
curl https://your-slate.vercel.app/api/projects \
  -H "Authorization: Bearer slat_xxxxx"

# Create an issue
curl -X POST https://your-slate.vercel.app/api/projects/slate/issues \
  -H "Authorization: Bearer slat_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"title": "Implement feature X", "priority": "high"}'

# Update status
curl -X PATCH https://your-slate.vercel.app/api/issues/abc123 \
  -H "Authorization: Bearer slat_xxxxx" \
  -d '{"status": "in_progress"}'

# Flag for human attention
curl -X PATCH https://your-slate.vercel.app/api/issues/abc123 \
  -H "Authorization: Bearer slat_xxxxx" \
  -d '{"needs_attention": true}'
```

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Supabase Configuration

After deployment, update in Supabase dashboard:

1. **Authentication → URL Configuration:**
   - Site URL: `https://your-slate.vercel.app`
   - Redirect URLs: `https://your-slate.vercel.app/auth/callback`

2. **Authentication → Providers:**
   - Enable Google OAuth
   - Add OAuth credentials

## License

MIT
