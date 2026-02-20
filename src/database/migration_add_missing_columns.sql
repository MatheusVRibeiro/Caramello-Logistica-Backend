-- =============================================================================
-- MIGRATION: Adicionar colunas faltantes na tabela fretes
-- =============================================================================
-- Executar apenas se as colunas NÃO existirem no banco de produção

-- 1. Adicionar coluna 'codigo_frete' (se não existir)
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS codigo_frete VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: FRT-2026-001)' AFTER id;

-- 2. Adicionar coluna 'numero_nota_fiscal' (se não existir)  
ALTER TABLE fretes ADD COLUMN IF NOT EXISTS numero_nota_fiscal VARCHAR(60) DEFAULT NULL COMMENT 'Nº da nota fiscal' AFTER ticket;

-- 3. Criar índice para melhor performance em queries de pendentes
ALTER TABLE fretes ADD INDEX IF NOT EXISTS idx_pagamento_id (pagamento_id);

-- 4. Verificar que a coluna 'data_frete' tem NOT NULL (se não tiver, adicionar)
-- ALTER TABLE fretes MODIFY COLUMN data_frete DATE NOT NULL;

-- 5. Verificar CHECK constraints (criados apenas em criação/recreação)
-- SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
-- WHERE TABLE_NAME='fretes' AND CONSTRAINT_TYPE='CHECK';

-- =============================================================================
-- Para diagnosticar o problema:
-- =============================================================================

-- Ver estrutura atual da tabela:
DESCRIBE fretes;

-- Ver colunas específicas:
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME='fretes' ORDER BY ORDINAL_POSITION;

-- Verificar índices:
SHOW INDEX FROM fretes;

-- Testar query de pendentes com motorista_id=18:
SELECT id, codigo_frete, origem, destino, motorista_id, motorista_nome, 
       caminhao_id, caminhao_placa, ticket, numero_nota_fiscal, 
       quantidade_sacas, toneladas, receita, custos, resultado, data_frete 
FROM fretes 
WHERE pagamento_id IS NULL AND motorista_id = 18
ORDER BY data_frete ASC, created_at ASC;
