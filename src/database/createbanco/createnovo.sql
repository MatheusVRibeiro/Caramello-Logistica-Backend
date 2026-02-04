-- Arquivo: src/dataBase/createbanco/createnovo.sql

CREATE DATABASE IF NOT EXISTS logistica_fretes_db;
USE logistica_fretes_db;

-- 1. Tabela de Usuários (Auth)
CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Motoristas
CREATE TABLE IF NOT EXISTS motoristas (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Caminhões
CREATE TABLE IF NOT EXISTS caminhoes (
  id VARCHAR(255) PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  capacidade DECIMAL(10,2), -- Em toneladas
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Mercadorias
CREATE TABLE IF NOT EXISTS mercadorias (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100), -- Ex: Carga Seca, Granel
  peso VARCHAR(50),  -- Ex: 25 ton
  dimensoes VARCHAR(255),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Fretes
CREATE TABLE IF NOT EXISTS fretes (
  id VARCHAR(255) PRIMARY KEY,
  origem VARCHAR(255) NOT NULL,
  destino VARCHAR(255) NOT NULL,
  status ENUM('pendente', 'em_transito', 'concluido', 'cancelado') DEFAULT 'pendente',
  receita DECIMAL(12,2) DEFAULT 0.00,
  custos_total DECIMAL(12,2) DEFAULT 0.00,
  resultado DECIMAL(12,2) DEFAULT 0.00,
  motorista_id VARCHAR(255),
  caminhao_id VARCHAR(255),
  mercadoria_id VARCHAR(255),
  data_partida DATETIME,
  data_chegada DATETIME,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (motorista_id) REFERENCES motoristas(id),
  FOREIGN KEY (caminhao_id) REFERENCES caminhoes(id),
  FOREIGN KEY (mercadoria_id) REFERENCES mercadorias(id)
);

-- 6. Tabela de Custos / Gastos
CREATE TABLE IF NOT EXISTS custos (
  id VARCHAR(255) PRIMARY KEY,
  frete_id VARCHAR(255) NOT NULL,
  tipo ENUM('combustivel', 'manutencao', 'pedagio', 'outros') NOT NULL,
  descricao VARCHAR(255),
  valor DECIMAL(12,2) NOT NULL,
  data_custo DATE,
  comprovante_url VARCHAR(255),
  FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE CASCADE
);