-- Persistent AI memory + training-feedback capture.
-- Embeddings are 1536-dim (OpenAI text-embedding-3-small).

create extension if not exists vector;

-- ── user_memories ────────────────────────────────────────────────────────────
create table if not exists public.user_memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  memory_text text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

-- One row per distinct fact per user (cheap exact-dedup; semantic dedup is
-- handled in app code before insert).
create unique index if not exists user_memories_user_text_key
  on public.user_memories (user_id, memory_text);

-- Cosine-distance ANN index for similarity search.
create index if not exists user_memories_embedding_idx
  on public.user_memories using hnsw (embedding vector_cosine_ops);

create index if not exists user_memories_user_id_idx
  on public.user_memories (user_id);

-- ── training_feedback ────────────────────────────────────────────────────────
-- Thumbs up/down on AI outputs — the seed of a future fine-tuning dataset.
create table if not exists public.training_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  feature    text not null,            -- 'cover_letter' | 'tailor_cv' | 'career_scan' | ...
  prompt     text,
  output     text,
  rating     smallint not null,        -- 1 = up, -1 = down
  created_at timestamptz not null default now()
);

create index if not exists training_feedback_user_id_idx
  on public.training_feedback (user_id);

-- ── Similarity search (top-N memories for a user) ────────────────────────────
create or replace function public.match_user_memories(
  p_user_id         uuid,
  p_query_embedding vector(1536),
  p_match_count     int default 5
)
returns table (id uuid, memory_text text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.memory_text,
    1 - (m.embedding <=> p_query_embedding) as similarity
  from public.user_memories m
  where m.user_id = p_user_id
    and m.embedding is not null
  order by m.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;

-- ── RLS (defense in depth; service-role API routes bypass this) ──────────────
alter table public.user_memories    enable row level security;
alter table public.training_feedback enable row level security;

drop policy if exists "own memories" on public.user_memories;
create policy "own memories" on public.user_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own feedback" on public.training_feedback;
create policy "own feedback" on public.training_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
