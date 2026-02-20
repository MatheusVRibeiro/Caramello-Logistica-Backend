-- =============================================================================
-- SCRIPT MASTER DE INICIALIZAÇÃO DO BANCO DE DADOS
-- =============================================================================

-- =============================================================================
-- 2. TABELA: usuarios (Independente)
-- =============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_usuario VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: USR-2026-001)',
  nome VARCHAR(200) NOT NULL COMMENT 'Nome completo do usuário',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email para login (único)',
  senha_hash VARCHAR(255) NOT NULL COMMENT 'Hash da senha (bcrypt)',
  role ENUM('admin', 'contabilidade', 'operador') NOT NULL DEFAULT 'operador' COMMENT 'Nível de acesso',
  ativo BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Status do usuário',
  telefone VARCHAR(20),
  documento VARCHAR(20) UNIQUE,
  ultimo_acesso TIMESTAMP NULL,
  tentativas_login_falhas INT DEFAULT 0,
  bloqueado_ate TIMESTAMP NULL,
  token_recuperacao VARCHAR(255),
  token_expiracao TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. TABELA: motoristas (Independente)
-- =============================================================================
CREATE TABLE IF NOT EXISTS motoristas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_motorista VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: MOT-2026-001)',
  nome VARCHAR(200) NOT NULL COMMENT 'Nome completo do motorista - OBRIGATÓRIO',
  documento VARCHAR(20) UNIQUE COMMENT 'CPF ou CNPJ do motorista/empresa',
  telefone VARCHAR(20) NOT NULL COMMENT 'Telefone principal - OBRIGATÓRIO',
  email VARCHAR(255),
  endereco TEXT,
  status ENUM('ativo', 'inativo', 'ferias') NOT NULL DEFAULT 'ativo',
  tipo ENUM('proprio', 'terceirizado', 'agregado') NOT NULL,
  tipo_pagamento ENUM('pix', 'transferencia_bancaria') NOT NULL DEFAULT 'pix',
  banco VARCHAR(100) NULL,
  agencia VARCHAR(10) NULL,
  conta VARCHAR(20) NULL,
  tipo_conta ENUM('corrente', 'poupanca') DEFAULT 'corrente',
  chave_pix_tipo ENUM('cpf', 'email', 'telefone', 'aleatoria', 'cnpj'),
  chave_pix VARCHAR(255),
  receita_gerada DECIMAL(15,2) DEFAULT 0.00,
  viagens_realizadas INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_tipo (tipo),
  INDEX idx_documento (documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. TABELA: fazendas (Independente)
-- =============================================================================
CREATE TABLE IF NOT EXISTS fazendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_fazenda VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: FAZ-2026-001)',
  fazenda VARCHAR(200) NOT NULL COMMENT 'Nome da fazenda',
  estado ENUM('SP', 'MS', 'MT') NOT NULL COMMENT 'Estado da operação',
  proprietario VARCHAR(200) NOT NULL,
  mercadoria VARCHAR(100) NOT NULL,
  variedade VARCHAR(100),
  safra VARCHAR(20) NOT NULL,
  preco_por_tonelada DECIMAL(10,2) NOT NULL,
  peso_medio_saca DECIMAL(10,2) DEFAULT 25.00,
  total_sacas_carregadas INT DEFAULT 0,
  total_toneladas DECIMAL(15,2) DEFAULT 0.00,
  faturamento_total DECIMAL(15,2) DEFAULT 0.00,
  ultimo_frete DATE,
  colheita_finalizada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fazenda (fazenda),
  INDEX idx_safra (safra),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. TABELA: frota (Depende de motoristas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS frota (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_veiculo VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: VEI-2026-001)',
  placa VARCHAR(10) NOT NULL UNIQUE COMMENT 'Placa do caminhão trator - OBRIGATÓRIO',
  modelo VARCHAR(100) NOT NULL COMMENT 'Modelo completo do veículo - OBRIGATÓRIO',
  tipo_veiculo ENUM('TRUCADO', 'TOCO', 'CARRETA', 'BITREM', 'RODOTREM') NOT NULL,
  status ENUM('disponivel', 'em_viagem', 'manutencao') NOT NULL DEFAULT 'disponivel',
  placa_carreta VARCHAR(10) UNIQUE COMMENT 'Placa do reboque/carreta',
  motorista_fixo_id INT COMMENT 'Vínculo numérico com motorista',
  ano_fabricacao INT,
  capacidade_toneladas DECIMAL(10,2),
  km_atual INT DEFAULT 0,
  tipo_combustivel ENUM('DIESEL', 'S10', 'ARLA', 'OUTRO') DEFAULT 'S10',
  renavam VARCHAR(20) UNIQUE,
  renavam_carreta VARCHAR(20) UNIQUE,
  chassi VARCHAR(30) UNIQUE,
  registro_antt VARCHAR(20),
  validade_seguro DATE,
  validade_licenciamento DATE,
  proprietario_tipo ENUM('PROPRIO', 'TERCEIRO', 'AGREGADO') DEFAULT 'PROPRIO',
  ultima_manutencao_data DATE,
  proxima_manutencao_km INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (motorista_fixo_id) REFERENCES motoristas(id) ON DELETE SET NULL,
  INDEX idx_placa (placa),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. TABELA: pagamentos (Depende de motoristas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_pagamento VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: PAG-2026-001)',
  motorista_id INT NOT NULL,
  motorista_nome VARCHAR(200) NOT NULL,
  periodo_fretes VARCHAR(50) NOT NULL,
  quantidade_fretes INT NOT NULL DEFAULT 1,
  fretes_incluidos TEXT,
  total_toneladas DECIMAL(10,2) NOT NULL,
  valor_por_tonelada DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  status ENUM('pendente', 'processando', 'pago', 'cancelado') DEFAULT 'pendente',
  metodo_pagamento ENUM('pix', 'transferencia_bancaria') NOT NULL,
  comprovante_nome VARCHAR(255),
  comprovante_url TEXT,
  comprovante_data_upload TIMESTAMP NULL,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE RESTRICT,
  INDEX idx_motorista (motorista_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. TABELA: fretes (Depende de motoristas, frota, fazendas e pagamentos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS fretes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_frete VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: FRT-2026-001)',
  origem VARCHAR(255) NOT NULL COMMENT 'Nome da fazenda de origem',
  destino ENUM('Filial 1 - Secagem e Armazenagem', 'Fazenda Santa Rosa - Secagem e Armazenagem') NOT NULL COMMENT 'Local de entrega pré-definido',
  motorista_id INT NOT NULL,
  caminhao_id INT NOT NULL,
  fazenda_id INT,
  pagamento_id INT,
  motorista_nome VARCHAR(200) NOT NULL,
  caminhao_placa VARCHAR(10) NOT NULL,
  ticket VARCHAR(50) DEFAULT NULL COMMENT 'Número do ticket da balança',
  numero_nota_fiscal VARCHAR(60) DEFAULT NULL COMMENT 'Nº da nota fiscal',
  fazenda_nome VARCHAR(200),
  mercadoria VARCHAR(100) NOT NULL,
  variedade VARCHAR(100),
  data_frete DATE NOT NULL,
  quantidade_sacas INT NOT NULL,
  toneladas DECIMAL(10,2) NOT NULL,
  valor_por_tonelada DECIMAL(10,2) NOT NULL,
  receita DECIMAL(10,2) NOT NULL,
  custos DECIMAL(10,2) DEFAULT 0.00,
  resultado DECIMAL(10,2) COMMENT 'Lucro líquido (receita - custos)',
  CONSTRAINT chk_fretes_quantidade_sacas CHECK (quantidade_sacas > 0),
  CONSTRAINT chk_fretes_toneladas CHECK (toneladas > 0),
  CONSTRAINT chk_fretes_valor_tonelada CHECK (valor_por_tonelada > 0),
  CONSTRAINT chk_fretes_receita CHECK (receita > 0),
  CONSTRAINT chk_fretes_custos CHECK (custos >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE RESTRICT,
  FOREIGN KEY (caminhao_id) REFERENCES frota(id) ON DELETE RESTRICT,
  FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE RESTRICT,
  FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id) ON DELETE SET NULL,
  INDEX idx_data_frete (data_frete),
  INDEX idx_destino (destino),
  INDEX idx_frete_motorista_id (motorista_id),
  INDEX idx_frete_fazenda_id (fazenda_id),
  INDEX idx_frete_pagamento_id (pagamento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. TABELA: custos (Depende de fretes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS custos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_custo VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: CST-2026-001)',
  frete_id INT NOT NULL,
  tipo ENUM('combustivel', 'manutencao', 'pedagio', 'outros') NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  comprovante BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  motorista VARCHAR(200),
  caminhao VARCHAR(10),
  rota VARCHAR(255),
  litros DECIMAL(10,2),
  tipo_combustivel ENUM('gasolina', 'diesel', 'etanol', 'gnv'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE CASCADE,
  INDEX idx_frete_id (frete_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. TABELA: anexos (Polimórfica)
-- =============================================================================
CREATE TABLE IF NOT EXISTS anexos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_anexo VARCHAR(20) UNIQUE NULL COMMENT 'ID de negócio (Ex: ANX-2026-001)',
  nome_original VARCHAR(500) NOT NULL,
  nome_arquivo VARCHAR(500) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanho INT NOT NULL,
  entidade_tipo VARCHAR(50) NOT NULL COMMENT 'PAGAMENTO, FRETE, CUSTO, etc',
  entidade_id INT NOT NULL COMMENT 'ID numérico da entidade vinculada',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_entidade (entidade_tipo, entidade_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
