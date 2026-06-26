# Como instalar o sistema Utah Invest

Tempo estimado: ~20 minutos

---

## PASSO 1 — Criar o banco de dados (Supabase)

1. Acesse https://supabase.com e crie uma conta gratuita
2. Clique em "New project"
   - Nome: `utah-financeiro`
   - Senha do banco: anote em local seguro
   - Região: South America (São Paulo)
3. Aguarde o projeto criar (~2 min)
4. No menu esquerdo, clique em **SQL Editor**
5. Cole todo o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**
6. Vá em **Project Settings → API** e copie:
   - `URL` → será o NEXT_PUBLIC_SUPABASE_URL
   - `anon public` → será o NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` → será o SUPABASE_SERVICE_ROLE_KEY (não compartilhe!)

---

## PASSO 2 — Criar o usuário Master

1. No Supabase, vá em **Authentication → Users**
2. Clique em **Invite user** (ou Add user)
3. Informe o e-mail do Master (ex: master@utahinvest.com.br)
4. Vá em **SQL Editor** e execute:

```sql
UPDATE public.profiles
SET role = 'master', nome = 'Seu Nome Aqui'
WHERE email = 'master@utahinvest.com.br';
```

---

## PASSO 3 — Hospedar no Vercel

1. Acesse https://vercel.com e crie uma conta gratuita (pode entrar com GitHub)
2. Clique em **Add New → Project**
3. Faça upload da pasta `utah-financeiro` ou conecte ao GitHub
4. Na tela de configuração, adicione as **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL        = (URL do passo 1)
NEXT_PUBLIC_SUPABASE_ANON_KEY   = (anon key do passo 1)
SUPABASE_SERVICE_ROLE_KEY       = (service role do passo 1)
CRON_SECRET                     = (invente uma senha, ex: Utah@2024Backup!)
```

5. Clique em **Deploy** e aguarde (~3 min)
6. Seu sistema estará em: `https://utah-financeiro.vercel.app`

---

## PASSO 4 — Configurar backup automático diário

O backup roda automaticamente todo dia às 18h (horário de Brasília).

Para ativar, no Vercel:
1. Vá em seu projeto → **Settings → Cron Jobs**
2. Verifique que `/api/cron/backup` está listado com schedule `0 21 * * *`
3. Em **Environment Variables**, certifique-se que `CRON_SECRET` está configurado

---

## PASSO 5 — Cadastrar assessores

1. Acesse o sistema com o login do Master
2. Vá em **Assessores** no menu
3. Cadastre cada assessor com nome, e-mail e senha inicial
4. Envie as credenciais para cada assessor

---

## Segurança

- Nenhum dado é visível sem login
- Assessores só enxergam os próprios lançamentos (garantido no banco de dados, não apenas no front-end)
- O backup diário é salvo como arquivo `.xlsx` e o histórico fica registrado no sistema
- O `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser compartilhado ou exposto

---

## Suporte

Em caso de dúvidas, os arquivos do projeto estão em:
`C:\Users\ASUS\Desktop\CLAUDE\utah-financeiro\`
