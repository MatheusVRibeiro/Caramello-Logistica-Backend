"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrotaController = void 0;
const zod_1 = require("zod");
const connection_1 = __importDefault(require("../database/connection"));
const id_1 = require("../utils/id");
const sql_1 = require("../utils/sql");
const validators_1 = require("../utils/validators");
const normalizeCaminhaoPayload_1 = require("../utils/normalizeCaminhaoPayload");
const FROTA_FIELDS = [
    'placa',
    'placa_carreta',
    'modelo',
    'ano_fabricacao',
    'status',
    'motorista_fixo_id',
    'capacidade_toneladas',
    'km_atual',
    'tipo_combustivel',
    'tipo_veiculo',
    'renavam',
    'renavam_carreta',
    'chassi',
    'registro_antt',
    'validade_seguro',
    'validade_licenciamento',
    'proprietario_tipo',
    'ultima_manutencao_data',
    'proxima_manutencao_km',
];
class FrotaController {
    async listar(_req, res) {
        try {
            // support query ?vagos=1 to list only vehicles without a fixed driver
            if (_req.query.vagos === '1' || _req.query.vagos === 'true') {
                const sqlVagos = `SELECT id, placa, modelo, ano_fabricacao FROM frota WHERE motorista_fixo_id IS NULL`;
                const [rows] = await connection_1.default.execute(sqlVagos);
                res.json({ success: true, data: rows });
                return;
            }
            const [rows] = await connection_1.default.execute('SELECT * FROM frota ORDER BY created_at DESC');
            res.json({
                success: true,
                message: 'Frota listada com sucesso',
                data: rows,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao listar frota',
            });
        }
    }
    async obterPorId(req, res) {
        try {
            const { id } = req.params;
            const [rows] = await connection_1.default.execute('SELECT * FROM frota WHERE id = ? LIMIT 1', [id]);
            const frota = rows;
            if (frota.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Veiculo nao encontrado',
                });
                return;
            }
            res.json({
                success: true,
                message: 'Veiculo carregado com sucesso',
                data: frota[0],
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao obter veiculo',
            });
        }
    }
    async criar(req, res) {
        try {
            const cleaned = (0, normalizeCaminhaoPayload_1.normalizeCaminhaoPayload)(req.body);
            const payload = validators_1.CriarCaminhaoSchema.parse(cleaned);
            const carretaTypes = ['CARRETA', 'BITREM', 'RODOTREM'];
            // Se o tipo de veiculo exige carreta, placa_carreta é obrigatoria
            if (carretaTypes.includes(payload.tipo_veiculo) && !payload.placa_carreta) {
                res.status(400).json({
                    success: false,
                    message: 'Placa da carreta obrigatoria para o tipo de veiculo selecionado',
                });
                return;
            }
            const id = payload.id || (0, id_1.generateId)('FROTA');
            const status = payload.status || 'disponivel';
            const tipoCombustivel = payload.tipo_combustivel || 'S10';
            const kmAtual = payload.km_atual ?? null;
            const proprietarioTipo = payload.proprietario_tipo || 'PROPRIO';
            await connection_1.default.execute(`INSERT INTO frota (
          id, placa, placa_carreta, modelo, ano_fabricacao, status, motorista_fixo_id,
          capacidade_toneladas, km_atual, tipo_combustivel, tipo_veiculo, renavam,
          renavam_carreta, chassi, registro_antt, validade_seguro, validade_licenciamento,
          proprietario_tipo, ultima_manutencao_data, proxima_manutencao_km
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                payload.placa,
                payload.placa_carreta ?? null,
                payload.modelo,
                payload.ano_fabricacao ?? null,
                status,
                payload.motorista_fixo_id || null,
                payload.capacidade_toneladas ?? null,
                kmAtual,
                tipoCombustivel,
                payload.tipo_veiculo,
                payload.renavam || null,
                payload.renavam_carreta || null,
                payload.chassi || null,
                payload.registro_antt || null,
                payload.validade_seguro || null,
                payload.validade_licenciamento || null,
                proprietarioTipo,
                payload.ultima_manutencao_data || null,
                payload.proxima_manutencao_km || null,
            ]);
            // Se veiculo estiver associado a um motorista, atualizamos relacionamento
            // nota: estratégia antiga de 'placa_temporaria' foi removida
            if (payload.motorista_fixo_id) {
                // Não é necessário limpar campo de placa temporária (removido do schema)
            }
            res.status(201).json({
                success: true,
                message: 'Veiculo criado com sucesso',
                data: { id },
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
                message: 'Erro ao criar veiculo',
            });
        }
    }
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const cleaned = (0, normalizeCaminhaoPayload_1.normalizeCaminhaoPayload)(req.body);
            const payload = validators_1.AtualizarCaminhaoSchema.parse(cleaned);
            const carretaTypes = ['CARRETA', 'BITREM', 'RODOTREM'];
            // Normalizar valores vazios para null
            if ('placa_carreta' in payload && payload.placa_carreta === '')
                payload.placa_carreta = null;
            if ('ano_fabricacao' in payload && payload.ano_fabricacao === '')
                payload.ano_fabricacao = null;
            if ('capacidade_toneladas' in payload && payload.capacidade_toneladas === '')
                payload.capacidade_toneladas = null;
            // Se for alterar para um tipo que exige carreta, garantir que haja placa_carreta (ou já exista no banco)
            if (payload.tipo_veiculo && carretaTypes.includes(payload.tipo_veiculo)) {
                const needsPlaca = !('placa_carreta' in payload) || !payload.placa_carreta;
                if (needsPlaca) {
                    const [rows] = await connection_1.default.execute('SELECT placa_carreta FROM frota WHERE id = ? LIMIT 1', [id]);
                    const existing = rows;
                    if (existing.length === 0 || !existing[0].placa_carreta) {
                        res.status(400).json({
                            success: false,
                            message: 'Placa da carreta obrigatoria para o tipo de veiculo selecionado',
                        });
                        return;
                    }
                }
            }
            const { fields, values } = (0, sql_1.buildUpdate)(payload, FROTA_FIELDS);
            if (fields.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Nenhum campo valido para atualizar',
                });
                return;
            }
            const sql = `UPDATE frota SET ${fields.join(', ')} WHERE id = ?`;
            values.push(id);
            const [result] = await connection_1.default.execute(sql, values);
            const info = result;
            if (info.affectedRows === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Veiculo nao encontrado',
                });
                return;
            }
            // Se foi associada um motorista, nada a limpar (placa_temporaria removida)
            if (payload.motorista_fixo_id) {
                // placeholder for future actions (e.g., audit)
            }
            res.json({
                success: true,
                message: 'Veiculo atualizado com sucesso',
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
                message: 'Erro ao atualizar veiculo',
            });
        }
    }
    async deletar(req, res) {
        try {
            const { id } = req.params;
            const [result] = await connection_1.default.execute('DELETE FROM frota WHERE id = ?', [id]);
            const info = result;
            if (info.affectedRows === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Veiculo nao encontrado',
                });
                return;
            }
            res.json({
                success: true,
                message: 'Veiculo removido com sucesso',
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao remover veiculo',
            });
        }
    }
}
exports.FrotaController = FrotaController;
//# sourceMappingURL=FrotaController.js.map