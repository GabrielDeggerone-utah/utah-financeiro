-- ============================================================
-- Utah Invest — Schema do banco de dados
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- Perfis dos usuários (vinculado ao auth.users do Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  role text not null default 'assessor' check (role in ('assessor', 'master')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Instituições de originação (gerenciadas pelo Master)
create table public.instituicoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Produtos (gerenciados pelo Master)
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Lançamentos de receita
create table public.receitas (
  id uuid primary key default gen_random_uuid(),
  assessor_id uuid not null references public.profiles(id) on delete cascade,
  data date not null,
  volume numeric(18,2) not null check (volume > 0),
  receita numeric(18,2),
  instituicao_id uuid references public.instituicoes(id),
  produto_id uuid references public.produtos(id),
  cliente_nome text,
  cliente_conta text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backups gerados
create table public.backups (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  gerado_por uuid references public.profiles(id),
  tipo text not null default 'manual' check (tipo in ('manual', 'automatico')),
  total_registros integer,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Dados iniciais
-- ============================================================

insert into public.instituicoes (nome) values
  ('XP Investimentos'),
  ('BTG Pactual'),
  ('Itaú'),
  ('Bradesco'),
  ('Santander'),
  ('Nubank'),
  ('Inter'),
  ('Órama'),
  ('Genial');

insert into public.produtos (nome) values
  ('Renda fixa'),
  ('Renda variável'),
  ('Câmbio'),
  ('Consórcio'),
  ('Seguro');

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles    enable row level security;
alter table public.instituicoes enable row level security;
alter table public.produtos     enable row level security;
alter table public.receitas     enable row level security;
alter table public.backups      enable row level security;

-- Profiles: cada um vê o próprio, master vê todos
create policy "profiles_self" on public.profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
  );

create policy "profiles_master_insert" on public.profiles
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
  );

create policy "profiles_master_update" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
  );

-- Instituições: todos leem, master edita
create policy "instituicoes_read" on public.instituicoes
  for select using (auth.uid() is not null);

create policy "instituicoes_master_write" on public.instituicoes
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
  );

-- Produtos: todos leem, master edita
create policy "produtos_read" on public.produtos
  for select using (auth.uid() is not null);

create policy "produtos_master_write" on public.produtos
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
  );

-- Receitas: assessor vê só as próprias, master vê todas
create policy "receitas_assessor_select" on public.receitas
  for select using (
    assessor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
  );

create policy "receitas_assessor_insert" on public.receitas
  for insert with check (assessor_id = auth.uid());

create policy "receitas_assessor_update" on public.receitas
  for update using (assessor_id = auth.uid());

create policy "receitas_assessor_delete" on public.receitas
  for delete using (assessor_id = auth.uid());

-- Backups: master apenas
create policy "backups_master" on public.backups
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master')
  );

-- ============================================================
-- Trigger: criar profile automaticamente no cadastro
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'assessor')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: atualizar updated_at nas receitas
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger receitas_updated_at
  before update on public.receitas
  for each row execute function public.set_updated_at();
