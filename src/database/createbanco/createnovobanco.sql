USE logistica_fretes_db;

CREATE TABLE IF NOT EXISTS caminhoes (
  id VARCHAR(255) PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  marca VARCHAR(50) NOT NULL,
  cor VARCHAR(30),
  ano_fabricacao INT,
  ano_modelo INT,
  
  -- Documentação e Fiscal
  renavam VARCHAR(20) UNIQUE,
  chassi VARCHAR(30) UNIQUE,
  registro_antt VARCHAR(20),
  validade_seguro DATE,
  validade_licenciamento DATE,
  
  -- Especificações Técnicas
  capacidade_toneladas DECIMAL(10,2) NOT NULL, -- Capacidade de carga
  km_atual INT DEFAULT 0, -- Odômetro atual
  tipo_combustivel ENUM('DIESEL', 'S10', 'ARLA', 'OUTRO') DEFAULT 'DIESEL',
  tipo_veiculo ENUM('TRUCADO', 'TOCO', 'CARRETA', 'BITREM', 'RODOTREM') DEFAULT 'CARRETA',
  
  -- Gestão e Status
  proprietario_tipo ENUM('PROPRIO', 'TERCEIRO', 'AGREGADO') DEFAULT 'PROPRIO',
  status ENUM('ATIVO', 'INATIVO', 'MANUTENCAO', 'EM_VIAGEM') DEFAULT 'ATIVO',
  
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Arquivo: src/dataBase/createbanco/createnovo.sql

CREATE TABLE IF NOT EXISTS caminhoes (
  -- Identificação Principal
  id VARCHAR(255) PRIMARY KEY, -- Mantendo VARCHAR(255) para bater com Motoristas
  placa VARCHAR(10) NOT NULL UNIQUE,
  placa_carreta VARCHAR(10) UNIQUE, -- Importante para bitrens/carretas
  modelo VARCHAR(100) NOT NULL,
  ano_fabricacao INT NOT NULL,
  
  -- Status e Operação
  status ENUM('disponivel', 'em_viagem', 'manutencao') NOT NULL DEFAULT 'disponivel',
  motorista_fixo_id VARCHAR(255), -- Caso o camião tenha um motorista "dono"
  
  -- Especificações Técnicas
  capacidade_toneladas DECIMAL(10,2) NOT NULL,
  km_atual INT NOT NULL DEFAULT 0,
  tipo_combustivel ENUM('DIESEL', 'S10', 'ARLA', 'OUTRO') DEFAULT 'S10',
  tipo_veiculo ENUM('TRUCADO', 'TOCO', 'CARRETA', 'BITREM', 'RODOTREM') NOT NULL,
  
  -- Documentação e Fiscal (Essencial para Logística Real)
  renavam VARCHAR(20) UNIQUE,
  renavam_carreta VARCHAR(20) UNIQUE,
  chassi VARCHAR(30) UNIQUE,
  registro_antt VARCHAR(20),
  validade_seguro DATE,
  validade_licenciamento DATE,
  
  -- Gestão e Manutenção
  proprietario_tipo ENUM('PROPRIO', 'TERCEIRO', 'AGREGADO') DEFAULT 'PROPRIO',
  ultima_manutencao_data DATE,
  proxima_manutencao_km INT COMMENT 'KM previsto para próxima revisão',
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Relacionamento com a tabela de motoristas que já criámos
  FOREIGN KEY (motorista_fixo_id) REFERENCES motoristas(id) ON DELETE SET NULL
) ENGINE=InnoDB;