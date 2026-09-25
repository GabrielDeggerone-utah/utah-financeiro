-- Funcionários (escritório)
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  data_admissao DATE NOT NULL,
  cargo VARCHAR(100),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_all_funcionarios" ON public.funcionarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );
CREATE POLICY "auth_read_funcionarios" ON public.funcionarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Períodos de férias: dias de direito por ano (pode ser editado manualmente)
CREATE TABLE IF NOT EXISTS public.periodos_ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  dias_direito INTEGER NOT NULL DEFAULT 30,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, ano)
);

ALTER TABLE public.periodos_ferias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_all_periodos" ON public.periodos_ferias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );
CREATE POLICY "auth_read_periodos" ON public.periodos_ferias
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Usos de férias: períodos de afastamento registrados
CREATE TABLE IF NOT EXISTS public.usos_ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_uteis INTEGER NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usos_ferias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_all_usos" ON public.usos_ferias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );
CREATE POLICY "auth_read_usos" ON public.usos_ferias
  FOR SELECT USING (auth.uid() IS NOT NULL);
