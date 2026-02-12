-- =============================================================================
-- TABELA: anexos (Gerencia uploads e PDFs do sistema)
-- =============================================================================
CREATE TABLE IF NOT EXISTS anexos (
  id VARCHAR(255) PRIMARY KEY COMMENT 'ID único do anexo (ANX_xxxxx)',
  nome_original VARCHAR(500) NOT NULL COMMENT 'Nome original do arquivo enviado',
  nome_arquivo VARCHAR(500) NOT NULL COMMENT 'Nome único do arquivo no servidor (timestamp)',
  url VARCHAR(1000) NOT NULL COMMENT 'URL para acesso ao arquivo (/uploads/...)',
  tipo_mime VARCHAR(100) NOT NULL COMMENT 'MIME type do arquivo (image/jpeg, application/pdf)',
  tamanho INT NOT NULL COMMENT 'Tamanho do arquivo em bytes',
  entidade_tipo VARCHAR(50) NOT NULL COMMENT 'Tipo da entidade (pagamento, frete, custo, etc)',
  entidade_id VARCHAR(255) NOT NULL COMMENT 'ID da entidade vinculada',
  observacoes TEXT COMMENT 'Observações sobre o anexo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora do upload',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_entidade (entidade_tipo, entidade_id),
  INDEX idx_tipo_mime (tipo_mime),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Armazenamento de anexos (comprovantes, notas fiscais, fotos, etc)';
