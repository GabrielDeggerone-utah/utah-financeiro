-- migration_v2.sql
-- Execute no Supabase SQL Editor

-- 1. Captações: adicionar campo tipo
ALTER TABLE public.captacoes
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'dinheiro_novo';

-- 2. Nova tabela contas (por conta individual, substituindo contas_mes na UI)
CREATE TABLE IF NOT EXISTS public.contas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessor_id   UUID NOT NULL REFERENCES auth.users(id),
  mes           VARCHAR(7) NOT NULL,
  tipo          VARCHAR(20) NOT NULL DEFAULT 'conta_nova', -- 'conta_nova' | 'xp_xp'
  numero_conta  VARCHAR(50),
  nome_cliente  VARCHAR(200),
  valor_ativacao NUMERIC(15,2) DEFAULT 0,
  pontos        NUMERIC(4,1) DEFAULT 0,
  observacao    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contas_select" ON public.contas FOR SELECT USING (true);
CREATE POLICY "contas_insert" ON public.contas FOR INSERT WITH CHECK (assessor_id = auth.uid());
CREATE POLICY "contas_update" ON public.contas FOR UPDATE USING (assessor_id = auth.uid());
CREATE POLICY "contas_delete" ON public.contas FOR DELETE USING (assessor_id = auth.uid());

-- 3. Metas: adicionar meta_receita e meta_pontos
ALTER TABLE public.metas
  ADD COLUMN IF NOT EXISTS meta_receita NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_pontos  NUMERIC(8,1)  DEFAULT 0;
