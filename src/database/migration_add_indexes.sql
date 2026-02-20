-- =============================================================================
-- MIGRATION: Indexes para melhorar performance de listagens e filtros
-- Execute cada indice apenas se ainda nao existir.
-- =============================================================================

-- FRETES
CREATE INDEX idx_fretes_motorista_id ON fretes (motorista_id);
CREATE INDEX idx_fretes_fazenda_id ON fretes (fazenda_id);
CREATE INDEX idx_fretes_pagamento_id ON fretes (pagamento_id);
CREATE INDEX idx_fretes_data_frete ON fretes (data_frete);
CREATE INDEX idx_fretes_destino ON fretes (destino);

-- CUSTOS
CREATE INDEX idx_custos_frete_id ON custos (frete_id);
CREATE INDEX idx_custos_data ON custos (data);
CREATE INDEX idx_custos_tipo ON custos (tipo);

-- PAGAMENTOS
CREATE INDEX idx_pagamentos_motorista_id ON pagamentos (motorista_id);
CREATE INDEX idx_pagamentos_status ON pagamentos (status);
CREATE INDEX idx_pagamentos_data ON pagamentos (data_pagamento);

-- USUARIOS
CREATE UNIQUE INDEX idx_usuarios_email ON usuarios (email);

-- FAZENDAS
CREATE INDEX idx_fazendas_fazenda ON fazendas (fazenda);
CREATE INDEX idx_fazendas_estado ON fazendas (estado);

-- FROTA
CREATE UNIQUE INDEX idx_frota_placa ON frota (placa);
CREATE INDEX idx_frota_motorista_fixo_id ON frota (motorista_fixo_id);
CREATE INDEX idx_frota_status ON frota (status);

-- MOTORISTAS
CREATE INDEX idx_motoristas_nome ON motoristas (nome);
CREATE INDEX idx_motoristas_status ON motoristas (status);
CREATE INDEX idx_motoristas_tipo ON motoristas (tipo);
