-- Metas por assessor por mês
CREATE TABLE IF NOT EXISTS public.metas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mes text NOT NULL, -- YYYY-MM
  meta_producao numeric(18,2) DEFAULT 0,
  meta_captacao_bruta numeric(18,2) DEFAULT 0,
  meta_captacao_net numeric(18,2) DEFAULT 0,
  meta_contas_abertas integer DEFAULT 0,
  meta_contas_ativas integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessor_id, mes)
);

-- Lançamentos de captação
CREATE TABLE IF NOT EXISTS public.captacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  captacao_bruta numeric(18,2) NOT NULL DEFAULT 0,
  saidas numeric(18,2) NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Contas por mês (upsert)
CREATE TABLE IF NOT EXISTS public.contas_mes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mes text NOT NULL, -- YYYY-MM
  contas_abertas integer NOT NULL DEFAULT 0,
  contas_ativas integer NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessor_id, mes)
);

-- RLS
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_mes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_read"  ON public.metas FOR SELECT USING (true);
CREATE POLICY "metas_write" ON public.metas FOR ALL   USING (true);

CREATE POLICY "captacoes_select" ON public.captacoes FOR SELECT USING (true);
CREATE POLICY "captacoes_insert" ON public.captacoes FOR INSERT WITH CHECK (assessor_id = auth.uid());
CREATE POLICY "captacoes_update" ON public.captacoes FOR UPDATE USING (assessor_id = auth.uid());
CREATE POLICY "captacoes_delete" ON public.captacoes FOR DELETE USING (assessor_id = auth.uid());

CREATE POLICY "contas_select" ON public.contas_mes FOR SELECT USING (true);
CREATE POLICY "contas_insert" ON public.contas_mes FOR INSERT WITH CHECK (assessor_id = auth.uid());
CREATE POLICY "contas_update" ON public.contas_mes FOR UPDATE USING (assessor_id = auth.uid());
CREATE POLICY "contas_delete" ON public.contas_mes FOR DELETE USING (assessor_id = auth.uid());

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_updated_at_col()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER metas_updated_at   BEFORE UPDATE ON public.metas      FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();
CREATE TRIGGER contas_updated_at  BEFORE UPDATE ON public.contas_mes  FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();
