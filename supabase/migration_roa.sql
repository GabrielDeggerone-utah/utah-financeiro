-- Adicionar campo ROA na tabela receitas
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS roa numeric(8,4);
