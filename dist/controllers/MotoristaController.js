"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotoristaController = void 0;
const zod_1 = require("zod");
const connection_1 = __importDefault(require("../database/connection"));
const id_1 = require("../utils/id");
const sql_1 = require("../utils/sql");
const validators_1 = require("../utils/validators");
const MOTORISTA_FIELDS = [
    'id',
    'nome',
    'cpf',
    'telefone',
    'email',
    'endereco',
    'cnh',
    'cnh_validade',
    'cnh_categoria',
    'status',
    'tipo',
    'data_admissao',
    'data_desligamento',
    'tipo_pagamento',
    'chave_pix_tipo',
    'chave_pix',
    'banco',
    'agencia',
    'conta',
    'tipo_conta',
    'receita_gerada',
    'viagens_realizadas',
    'caminhao_atual',
];
class MotoristaController {
    async listar(_req, res) {
        try {
            const [rows] = await connection_1.default.execute('SELECT * FROM motoristas ORDER BY created_at DESC');
            res.json({
                success: true,
                message: 'Motoristas listados com sucesso',
                data: rows,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao listar motoristas',
            });
        }
    }
    async obterPorId(req, res) {
        try {
            const { id } = req.params;
            const sql = `SELECT ${MOTORISTA_FIELDS.join(', ')} FROM motoristas WHERE id = ?`;
            const [rows] = await connection_1.default.execute(sql, [id]);
            const motoristas = rows;
            if (motoristas.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Motorista nao encontrado',
                });
                return;
            }
            const motorista = motoristas[0];
            // fetch bound vehicle (if any)
            const [frotaRows] = await connection_1.default.execute('SELECT id, placa, modelo, motorista_fixo_id FROM frota WHERE motorista_fixo_id = ? LIMIT 1', [id]);
            if (frotaRows && frotaRows.length > 0) {
                motorista.veiculo_vinculado = frotaRows[0];
            }
            res.json({
                success: true,
                message: 'Motorista carregado com sucesso',
                data: motorista,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao obter motorista',
            });
        }
    }
    async criar(req, res) {
        try {
            // Normalize empty strings to null for optional fields coming from the frontend
            const cleanedRequest = { ...req.body };
            ['email', 'banco', 'agencia', 'conta', 'chave_pix', 'cnh', 'cnh_validade', 'cnh_categoria', 'cpf', 'tipo_conta', 'endereco']
                .forEach((k) => {
                if (k in cleanedRequest && cleanedRequest[k] === '')
                    cleanedRequest[k] = null;
            });
            const payload = validators_1.CriarMotoristaSchemaWithVinculo.parse(cleanedRequest);
            // Higienização: proteções para campos opcionais
            const cpfLimpo = payload.cpf ? String(payload.cpf).replace(/\D/g, '') : null;
            const cnhLimpa = payload.cnh ? String(payload.cnh).replace(/\D/g, '') : null;
            const telefoneLimpo = payload.telefone ? String(payload.telefone).replace(/\D/g, '') : null;
            const chavePixLimpa = payload.chave_pix ? String(payload.chave_pix).replace(/\D/g, '') : null;
            const id = payload.id || (0, id_1.generateId)('MOT');
            const connection = await connection_1.default.getConnection();
            try {
                await connection.beginTransaction();
                const sql = `INSERT INTO motoristas (
          id, nome, cpf, telefone, email, endereco, cnh, cnh_validade, cnh_categoria,
          status, tipo, data_admissao, data_desligamento, tipo_pagamento, chave_pix_tipo,
          chave_pix, banco, agencia, conta, tipo_conta, receita_gerada, viagens_realizadas,
          caminhao_atual
        ) VALUES (${new Array(23).fill('?').join(',')})`;
                const dadosMotorista = {
                    nome: payload.nome,
                    cpf: cpfLimpo,
                    telefone: telefoneLimpo,
                    email: payload.email || null,
                    endereco: payload.endereco || null,
                    cnh: cnhLimpa,
                    cnh_validade: payload.cnh_validade || null,
                    cnh_categoria: payload.cnh_categoria || null,
                    status: payload.status || 'ativo',
                    tipo: payload.tipo,
                    data_admissao: payload.data_admissao || null,
                    data_desligamento: payload.data_desligamento || null,
                    tipo_pagamento: payload.tipo_pagamento || null,
                    chave_pix_tipo: payload.chave_pix_tipo || null,
                    chave_pix: chavePixLimpa || null,
                    banco: payload.banco || null,
                    agencia: payload.agencia || null,
                    conta: payload.conta || null,
                    tipo_conta: payload.tipo_conta || null,
                    receita_gerada: payload.receita_gerada || 0,
                    viagens_realizadas: payload.viagens_realizadas || 0,
                    caminhao_atual: payload.caminhao_atual || null,
                };
                const values = [
                    id,
                    dadosMotorista.nome,
                    dadosMotorista.cpf,
                    dadosMotorista.telefone,
                    dadosMotorista.email,
                    dadosMotorista.endereco,
                    dadosMotorista.cnh,
                    dadosMotorista.cnh_validade,
                    dadosMotorista.cnh_categoria,
                    dadosMotorista.status,
                    dadosMotorista.tipo,
                    dadosMotorista.data_admissao,
                    dadosMotorista.data_desligamento,
                    dadosMotorista.tipo_pagamento,
                    dadosMotorista.chave_pix_tipo,
                    dadosMotorista.chave_pix,
                    dadosMotorista.banco,
                    dadosMotorista.agencia,
                    dadosMotorista.conta,
                    dadosMotorista.tipo_conta,
                    dadosMotorista.receita_gerada,
                    dadosMotorista.viagens_realizadas,
                    dadosMotorista.caminhao_atual,
                ];
                await connection.execute(sql, values);
                // Vincula ao veículo se informado e aplicável
                if (payload.veiculo_id && ['terceirizado', 'agregado'].includes(payload.tipo)) {
                    const [rows] = await connection.execute('SELECT id FROM frota WHERE id = ?', [payload.veiculo_id]);
                    if (!rows || rows.length === 0) {
                        await connection.rollback();
                        connection.release();
                        res.status(400).json({ success: false, message: 'Veículo informado não existe' });
                        return;
                    }
                    await connection.execute('UPDATE frota SET motorista_fixo_id = ? WHERE id = ?', [id, payload.veiculo_id]);
                }
                await connection.commit();
                connection.release();
                res.status(201).json({
                    success: true,
                    message: 'Motorista criado com sucesso',
                    data: { id },
                });
            }
            catch (err) {
                await connection.rollback();
                connection.release();
                throw err;
            }
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Dados inválidos. Verifique os campos preenchidos.',
                    error: error.errors.map((err) => err.message).join('; '),
                });
                return;
            }
            // Erro de CPF/CNH duplicado
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
                const msg = String(error).includes('cpf')
                    ? 'Este CPF já está cadastrado no sistema.'
                    : String(error).includes('cnh')
                        ? 'Esta CNH já está cadastrada no sistema.'
                        : 'Dados duplicados. Verifique CPF ou CNH.';
                res.status(409).json({ success: false, message: msg });
                return;
            }
            res.status(500).json({ success: false, message: 'Erro ao criar motorista. Tente novamente.' });
        }
    }
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            // Normalize empty strings to null for update payloads
            const cleanedRequest = { ...req.body };
            ['email', 'banco', 'agencia', 'conta', 'chave_pix', 'cnh', 'cnh_validade', 'cnh_categoria', 'cpf', 'tipo_conta', 'endereco']
                .forEach((k) => {
                if (k in cleanedRequest && cleanedRequest[k] === '')
                    cleanedRequest[k] = null;
            });
            const payload = validators_1.AtualizarMotoristaSchemaWithVinculo.parse(cleanedRequest);
            // Regra de negocio: antiga lógica com 'placa_temporaria' removida do schema
            // Se necessário, utilizar `veiculo_id` / `motorista_fixo_id` para vínculo.
            const { fields, values } = (0, sql_1.buildUpdate)(payload, MOTORISTA_FIELDS);
            if (fields.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Nenhum campo valido para atualizar',
                });
                return;
            }
            const sql = `UPDATE motoristas SET ${fields.join(', ')} WHERE id = ?`;
            values.push(id);
            const [result] = await connection_1.default.execute(sql, values);
            const info = result;
            if (info.affectedRows === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Motorista nao encontrado',
                });
                return;
            }
            res.json({
                success: true,
                message: 'Motorista atualizado com sucesso',
            });
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Dados invalidos',
                    error: error.errors.map((err) => err.message).join('; '),
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar motorista',
            });
        }
    }
    async deletar(req, res) {
        try {
            const { id } = req.params;
            const [result] = await connection_1.default.execute('DELETE FROM motoristas WHERE id = ?', [id]);
            const info = result;
            if (info.affectedRows === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Motorista nao encontrado',
                });
                return;
            }
            res.json({
                success: true,
                message: 'Motorista removido com sucesso',
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao remover motorista',
            });
        }
    }
}
exports.MotoristaController = MotoristaController;
//# sourceMappingURL=MotoristaController.js.map