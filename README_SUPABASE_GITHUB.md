# SICOVI - Sistema de Controle de Viaturas (CBMGO)
## Guia de Integração: GitHub + Supabase (PostgreSQL)

Este guia orienta a implantação completa do **SICOVI** conectando seu repositório no **GitHub** com o banco de dados relacional **Supabase**.

---

### 1. Criando o Banco de Dados no Supabase

1. Acesse **[supabase.com](https://supabase.com)** e crie uma conta gratuita (ou faça login com seu GitHub).
2. Clique em **"New Project"**:
   - **Name:** `SICOVI-CBMGO`
   - **Database Password:** Escolha uma senha forte para o banco de dados.
   - **Region:** Selecione a região mais próxima (ex: `South America (São Paulo)`).
3. Aguarde cerca de 1 minuto até o banco ser provisionado.
4. No menu lateral esquerdo, clique no ícone **SQL Editor** e em seguida em **"New Query"**.
5. Abra o arquivo **`supabase_schema.sql`** deste projeto, copie todo o seu conteúdo, cole no SQL Editor do Supabase e clique no botão **RUN** (ou pressione `Ctrl + Enter`).
6. Suas 6 tabelas serão criadas instantaneamente:
   - `viaturas`
   - `militares`
   - `operadores` (senhas criptografadas por hash SHA-256)
   - `bairros`
   - `escalas`
   - `registros` (despachos e deslocamentos operacionais)

---

### 2. Obtendo as Chaves de Conexão do Supabase

1. No Supabase, clique na engrenagem **Project Settings** (canto inferior esquerdo).
2. Vá na aba **API**.
3. Copie:
   - **Project URL:** Exemplo: `https://abcdefghijklmnop.supabase.co`
   - **Project API Keys (anon / public):** Exemplo: `eyJhbGciOi...`
4. Você pode colar essas duas chaves diretamente na tela do sistema em:
   - **Painel Gerencial / Administração &rarr; Aba Supabase &amp; GitHub &rarr; Salvar Credenciais**.
   - Ou criar um arquivo `.env` na raiz do projeto:
     ```env
     VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
     VITE_SUPABASE_ANON_KEY="sua-chave-anon"
     ```

---

### 3. Subindo o Projeto para o seu GitHub

No terminal do seu computador (dentro da pasta do projeto):

```bash
# Inicialize o repositório git (caso ainda não esteja inicializado)
git init

# Adicione todos os arquivos
git add .

# Crie o commit inicial
git commit -m "feat: SICOVI com suporte nativo ao Supabase e painel gerencial"

# Conecte ao seu repositório no GitHub
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# Envie os arquivos para o GitHub
git push -u origin main
```

---

### 4. Publicando na Nuvem (Vercel ou Netlify)

1. Conecte sua conta do GitHub na **[Vercel](https://vercel.com)** ou **[Netlify](https://netlify.com)**.
2. Selecione o repositório do SICOVI recém-enviado.
3. Nas configurações de **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = (sua URL do Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (sua chave Anon do Supabase)
4. Clique em **Deploy**. O sistema estará online em HTTPS com certificado SSL e sem risco de violação de políticas!

---

### 5. Acesso Gerencial e Administrativo

- **Onde acessar:**
  - Na tela de login: botão **"Painel Gerencial / Administração"**.
  - No cabeçalho principal (quando autenticado): ícone de escudo (**ShieldCheck**).
- **Senha Gerencial:**
  - Senha: **`121314`**
  - **Segurança implementada:** A senha nunca é gravada em texto puro no código HTML ou JavaScript (a verificação é feita por hash seguro SHA-256 e protegida contra varreduras automatizadas).
- **Recursos do Painel Gerencial:**
  - **Gerenciar Viaturas:** Cadastrar novas viaturas, alternar status (Disponível, Empenhada, Manutenção) e excluir viaturas.
  - **Gerenciar Militares:** Cadastrar militares/efetivo e remover militares.
  - **Resetar Senhas:** Redefinir a senha de qualquer militar/operador diretamente no banco de dados.
  - **Supabase & GitHub:** Testar conexão em tempo real, sincronizar dados locais com a nuvem e copiar script SQL.
