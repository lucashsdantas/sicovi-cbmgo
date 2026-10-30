-- ============================================================================
-- SICOVI - SISTEMA DE CONTROLE DE VIATURAS (CBMGO)
-- Script de Migração e Criação de Banco de Dados para o Supabase (PostgreSQL)
-- ============================================================================
-- Como usar:
-- 1. Crie um projeto gratuito no Supabase (https://supabase.com)
-- 2. No menu lateral, acerte no ícone "SQL Editor" -> "New Query"
-- 3. Cole todo este código e clique em "RUN" (ou CTRL + ENTER)
-- 4. Suas tabelas, índices e dados iniciais serão criados em segundos!
-- ============================================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TABELA DE VIATURAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.viaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prefixo VARCHAR(50) UNIQUE NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'GERAL', -- 'RESGATE', 'INCÊNDIO', 'ADMINISTRATIVA', 'GERAL'
    status VARCHAR(50) NOT NULL DEFAULT 'DISPONÍVEL', -- 'DISPONÍVEL', 'EMPENHADA', 'MANUTENÇÃO', 'VISTORIA'
    km_atual NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE MILITARES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.militares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) UNIQUE NOT NULL,
    graduacao VARCHAR(50) DEFAULT '',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE OPERADORES / USUÁRIOS E SENHAS
-- As senhas são gravadas protegidas por hash no banco de dados
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE BAIRROS E DESTINOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bairros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) UNIQUE NOT NULL,
    zona VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE ESCALAS DE SERVIÇO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viatura VARCHAR(50) NOT NULL,
    condutor VARCHAR(100) NOT NULL,
    equipe TEXT DEFAULT '',
    data_escala DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE REGISTROS DE DESPACHO / DESLOCAMENTOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros (
    id BIGSERIAL PRIMARY KEY,
    viatura VARCHAR(50) NOT NULL,
    condutor VARCHAR(100) NOT NULL,
    equipe TEXT DEFAULT '',
    destino VARCHAR(150) NOT NULL,
    bairro VARCHAR(100) DEFAULT '',
    rai VARCHAR(50) DEFAULT '',
    natureza VARCHAR(150) DEFAULT '',
    saida TIMESTAMP WITH TIME ZONE NOT NULL,
    km_saida NUMERIC NOT NULL,
    chegada TIMESTAMP WITH TIME ZONE,
    km_chegada NUMERIC,
    operador VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas ultra-rápidas
CREATE INDEX IF NOT EXISTS idx_registros_viatura ON public.registros(viatura);
CREATE INDEX IF NOT EXISTS idx_registros_saida ON public.registros(saida DESC);
CREATE INDEX IF NOT EXISTS idx_registros_operador ON public.registros(operador);

-- Sincronização da sequência para que o próximo ID automático seja sempre o maior ID + 1
SELECT setval(pg_get_serial_sequence('public.registros', 'id'), COALESCE((SELECT MAX(id) FROM public.registros), 1));

-- ----------------------------------------------------------------------------
-- POLÍTICAS DE ACESSO (Row Level Security - RLS)
-- Permitir leitura e escrita autenticada ou via anon key para o frontend
-- ----------------------------------------------------------------------------
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.militares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bairros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público/anon para a aplicação
DROP POLICY IF EXISTS "Acesso total viaturas" ON public.viaturas;
CREATE POLICY "Acesso total viaturas" ON public.viaturas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total militares" ON public.militares;
CREATE POLICY "Acesso total militares" ON public.militares FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total operadores" ON public.operadores;
CREATE POLICY "Acesso total operadores" ON public.operadores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total bairros" ON public.bairros;
CREATE POLICY "Acesso total bairros" ON public.bairros FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total escalas" ON public.escalas;
CREATE POLICY "Acesso total escalas" ON public.escalas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total registros" ON public.registros;
CREATE POLICY "Acesso total registros" ON public.registros FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- DADOS INICIAIS (SEEDS)
-- ----------------------------------------------------------------------------
INSERT INTO public.viaturas (prefixo, categoria, status) VALUES
    ('UR-123', 'RESGATE', 'DISPONÍVEL'),
    ('UR-145', 'RESGATE', 'EMPENHADA'),
    ('USA-01', 'RESGATE', 'DISPONÍVEL'),
    ('ABT-32', 'INCÊNDIO', 'DISPONÍVEL'),
    ('ABT-44', 'INCÊNDIO', 'EMPENHADA'),
    ('ABS-10', 'INCÊNDIO', 'MANUTENÇÃO'),
    ('ASA-05', 'ADMINISTRATIVA', 'DISPONÍVEL'),
    ('ADM-02', 'ADMINISTRATIVA', 'DISPONÍVEL')
ON CONFLICT (prefixo) DO NOTHING;

INSERT INTO public.militares (nome, graduacao) VALUES
    ('Cap Menezes', 'Capitão'),
    ('1º Ten Martins', '1º Tenente'),
    ('2º Ten Cardoso', '2º Tenente'),
    ('SubTen Dantas', 'Subtenente'),
    ('1º Sgt Silva', '1º Sargento'),
    ('2º Sgt Almeida', '2º Sargento'),
    ('3º Sgt Pereira', '3º Sargento'),
    ('Cb Costa', 'Cabo'),
    ('Cb Moreira', 'Cabo'),
    ('Sd Oliveira', 'Soldado'),
    ('Sd Lucas', 'Soldado'),
    ('Sd Borges', 'Soldado'),
    ('Sd Souza', 'Soldado')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.bairros (nome, zona) VALUES
    ('Centro', 'Central'),
    ('Setor Bueno', 'Sul'),
    ('Jardim Goiás', 'Sul'),
    ('Marista', 'Sul'),
    ('Campinas', 'Oeste'),
    ('Setor Sul', 'Sul'),
    ('Setor Oeste', 'Oeste'),
    ('Vila Nova', 'Leste'),
    ('Jardim América', 'Sudoeste')
ON CONFLICT (nome) DO NOTHING;

-- Inserção de operadores padrão
-- Hash de exemplo para senhas iniciais (123456)
INSERT INTO public.operadores (usuario, senha_hash, is_admin) VALUES
    ('SubTen Dantas', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', true),
    ('1º Sgt Silva', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false),
    ('Cb Costa', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false),
    ('Sd Lucas', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false),
    ('1º Ten Martins', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', false)
ON CONFLICT (usuario) DO NOTHING;
