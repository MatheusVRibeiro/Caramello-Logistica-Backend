-- ==================== USUÁRIO ====================
CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- ==================== MERCADORIA ====================
CREATE TABLE IF NOT EXISTS mercadorias (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  tarifaPorSaca FLOAT NOT NULL,
  pesoMedioSaca FLOAT NOT NULL DEFAULT 25,
  ativo BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nome (nome)
);

-- ==================== MOTORISTA ====================
CREATE TABLE IF NOT EXISTS motoristas (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  status ENUM('ativo', 'inativo', 'ferias') DEFAULT 'ativo',
  receitaGerada FLOAT DEFAULT 0,
  viagensRealizadas INT DEFAULT 0,
  dataAdmissao DATE,
  ativo BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cpf (cpf),
  INDEX idx_status (status)
);

-- ==================== CAMINHÃO ====================
CREATE TABLE IF NOT EXISTS caminhoes (
  id VARCHAR(255) PRIMARY KEY,
  placa VARCHAR(20) NOT NULL UNIQUE,
  modelo VARCHAR(255) NOT NULL,
  capacidade FLOAT NOT NULL,
  status ENUM('disponivel', 'em_viagem', 'manutencao') DEFAULT 'disponivel',
  kmRodados FLOAT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_placa (placa),
  INDEX idx_status (status)
);

-- ==================== TABELA DE REFERÊNCIA: CUSTO ABASTECIMENTO ====================
CREATE TABLE IF NOT EXISTS custo_abastecimento (
  id VARCHAR(255) PRIMARY KEY,
  caminhaoId VARCHAR(255) NOT NULL,
  custoLitro FLOAT NOT NULL,
  dataAtualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (caminhaoId) REFERENCES caminhoes(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_caminhao_unico (caminhaoId)
);

-- ==================== TABELA DE REFERÊNCIA: CUSTO MOTORISTA ====================
CREATE TABLE IF NOT EXISTS custo_motorista (
  id VARCHAR(255) PRIMARY KEY,
  motoristaId VARCHAR(255) NOT NULL,
  diaria FLOAT NOT NULL,
  adicionalPernoite FLOAT NOT NULL,
  dataAtualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (motoristaId) REFERENCES motoristas(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_motorista_unico (motoristaId)
);

-- ==================== FRETE (Principal) ====================
CREATE TABLE IF NOT EXISTS fretes (
  id VARCHAR(255) PRIMARY KEY,
  origem VARCHAR(255) NOT NULL,
  destino VARCHAR(255) NOT NULL,
  status ENUM('pendente', 'em_transito', 'concluido', 'cancelado') DEFAULT 'pendente',
  receita FLOAT DEFAULT 0,
  custos FLOAT DEFAULT 0,
  resultado FLOAT DEFAULT 0,
  descricao TEXT,
  
  -- Relacionamentos
  motoristaId VARCHAR(255) NOT NULL,
  caminhaoId VARCHAR(255) NOT NULL,
  mercadoriaId VARCHAR(255),
  
  -- Quantidade de sacas (mudou de descrição genérica para quantidade)
  quantidadeSacas INT DEFAULT 0,
  
  -- Datas
  dataPartida DATETIME,
  dataChegada DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (motoristaId) REFERENCES motoristas(id) ON DELETE CASCADE,
  FOREIGN KEY (caminhaoId) REFERENCES caminhoes(id) ON DELETE CASCADE,
  FOREIGN KEY (mercadoriaId) REFERENCES mercadorias(id) ON SET NULL,
  INDEX idx_status (status),
  INDEX idx_motorista (motoristaId),
  INDEX idx_caminhao (caminhaoId),
  INDEX idx_mercadoria (mercadoriaId),
  INDEX idx_data (createdAt)
);

-- ==================== CUSTO (Despesas adicionais) ====================
CREATE TABLE IF NOT EXISTS custos (
  id VARCHAR(255) PRIMARY KEY,
  freteId VARCHAR(255) NOT NULL,
  tipo ENUM('combustivel', 'manutencao', 'pedagio', 'outros') NOT NULL,
  descricao TEXT NOT NULL,
  valor FLOAT NOT NULL,
  data DATE NOT NULL,
  comprovante BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (freteId) REFERENCES fretes(id) ON DELETE CASCADE,
  INDEX idx_frete (freteId),
  INDEX idx_tipo (tipo),
  INDEX idx_data (data)
);

