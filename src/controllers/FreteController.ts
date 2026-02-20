import { Response } from 'express';
import pool from '../database/connection';
import { ApiResponse, AuthRequest } from '../types';
import { buildUpdate, getPagination } from '../utils/sql';
import { AtualizarFreteSchema, CriarFreteSchema } from '../utils/validators';
import { sendValidationError } from '../utils/validation';

const FRETE_FIELDS = [
  'codigo_frete',
  'origem',
  'destino',
  'motorista_id',
  'motorista_nome',
  'caminhao_id',
  'ticket',
  'numero_nota_fiscal',
  'caminhao_placa',
  'fazenda_id',
  'fazenda_nome',
  'mercadoria',
  'mercadoria_id',
  'variedade',
  'data_frete',
  'quantidade_sacas',
  'toneladas',
  'valor_por_tonelada',
  'receita',
  'custos',
  'resultado',
  'pagamento_id',
];

export class FreteController {
  // Gerar próximo código sequencial de frete (FRT-2026-001, FRT-2026-002...)
  private async gerarProximoCodigoFrete(): Promise<string> {
    const anoAtual = new Date().getFullYear();
    const prefixo = `FRT-${anoAtual}-`;

    try {
      // Buscar o último código de frete do ano atual
      const [rows] = await pool.execute(
        `SELECT codigo_frete FROM fretes WHERE codigo_frete LIKE ? ORDER BY codigo_frete DESC LIMIT 1`,
        [`${prefixo}%`]
      );

      const fretes = rows as Array<{ codigo_frete: string | null }>;

      if (fretes.length === 0) {
        return `${prefixo}001`;
      }

      const ultimoCodigo = fretes[0].codigo_frete || '';
      const ultimoNumero = parseInt(ultimoCodigo.split('-')[2] || '0', 10);
      const proximoNumero = ultimoNumero + 1;

      return `${prefixo}${proximoNumero.toString().padStart(3, '0')}`;
    } catch (error) {
      // Se a coluna codigo_frete não existir, usar um ID baseado em timestamp
      console.warn('⚠️ [FRETES] Coluna codigo_frete não existe. Usando fallback com ID timestamp.');
      const timestamp = Date.now();
      return `${prefixo}X${timestamp}`;
    }
  }

  async listar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit, offset } = getPagination(req.query as Record<string, unknown>);
      // Query com JOINs para garantir dados atualizados
      // Também usa os campos cache (motorista_nome, caminhao_placa) como fallback
      let sql = `
        SELECT 
          f.*,
          COALESCE(f.motorista_nome, m.nome) as motorista_nome,
          COALESCE(f.caminhao_placa, fr.placa) as caminhao_placa,
          m.tipo as motorista_tipo,
          fr.modelo as caminhao_modelo
        FROM fretes f
        LEFT JOIN motoristas m ON m.id = f.motorista_id
        LEFT JOIN frota fr ON fr.id = f.caminhao_id
      `;

      let countSql = 'SELECT COUNT(*) as total FROM fretes f';

      const params: (string | number | Date)[] = [];

      // Filtros opcionais por query params
      const whereClauses: string[] = [];
      
      // Filtro por data inicial
      if (req.query.data_inicio) {
        whereClauses.push('f.data_frete >= ?');
        params.push(req.query.data_inicio as string);
      }
      
      // Filtro por data final
      if (req.query.data_fim) {
        whereClauses.push('f.data_frete <= ?');
        params.push(req.query.data_fim as string);
      }
      
      // Filtro por motorista
      if (req.query.motorista_id) {
        whereClauses.push('f.motorista_id = ?');
        params.push(req.query.motorista_id as string);
      }
      
      // Filtro por fazenda
      if (req.query.fazenda_id) {
        whereClauses.push('f.fazenda_id = ?');
        params.push(req.query.fazenda_id as string);
      }

      if (whereClauses.length > 0) {
        const where = ' WHERE ' + whereClauses.join(' AND ');
        sql += where;
        countSql += where;
      }

      sql += ` ORDER BY f.data_frete DESC, f.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const [rowsResult, countResult] = await Promise.all([
        pool.execute(sql, params),
        pool.execute(countSql, params),
      ]);

      const rows = rowsResult[0];
      const total = (countResult[0] as Array<{ total: number }>)[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      
      res.json({
        success: true,
        message: 'Fretes listados com sucesso',
        data: rows,
        meta: { page, limit, total, totalPages },
      } as ApiResponse<unknown>);
    } catch (error) {
      console.error('❌ [FRETES] Erro ao listar:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar fretes',
      } as ApiResponse<null>);
    }
  }

  async pendentes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const motoristaIdParam = req.query.motorista_id as string | undefined;
      const params: (string | number)[] = [];
      
      // Query com colunas opcionais usando COALESCE (compatível com DBs antigos)
      let sql = `
        SELECT 
          id, 
          COALESCE(codigo_frete, NULL) as codigo_frete, 
          origem, 
          destino, 
          motorista_id, 
          motorista_nome, 
          caminhao_id, 
          caminhao_placa, 
          COALESCE(ticket, NULL) as ticket, 
          COALESCE(numero_nota_fiscal, NULL) as numero_nota_fiscal, 
          quantidade_sacas, 
          toneladas, 
          receita, 
          COALESCE(custos, 0) as custos, 
          COALESCE(resultado, (receita - COALESCE(custos, 0))) as resultado, 
          data_frete 
        FROM fretes 
        WHERE pagamento_id IS NULL
      `;

      if (motoristaIdParam) {
        const motoristaId = Number(motoristaIdParam);
        if (Number.isNaN(motoristaId)) {
          res.status(400).json({ success: false, message: 'motorista_id inválido' } as ApiResponse<null>);
          return;
        }
        sql += ' AND motorista_id = ?';
        params.push(motoristaId);
      }

      sql += ' ORDER BY data_frete ASC, created_at ASC';

      const [rows] = await pool.execute(sql, params);
      res.json({ success: true, message: 'Fretes pendentes listados', data: rows } as ApiResponse<unknown>);
    } catch (error) {
      console.error('❌ [FRETES] Erro ao listar pendentes:', error);
      console.error('Details:', (error as Error).message);
      
      // Se o erro for sobre coluna não encontrada, retornar erro informativo
      const errorMsg = (error as Error).message || '';
      if (errorMsg.includes('Unknown column') || errorMsg.includes('COLUMN')) {
        res.status(400).json({ 
          success: false, 
          message: 'Erro na estrutura do banco de dados. Verifique se todas as colunas existem (codigo_frete, numero_nota_fiscal). Execute a migration se necessário.',
          code: 'DB_SCHEMA_ERROR'
        } as ApiResponse<null>);
        return;
      }
      
      res.status(500).json({ success: false, message: 'Erro ao listar fretes pendentes' } as ApiResponse<null>);
    }
  }

  async obterPorId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const [rows] = await pool.execute(`
        SELECT 
          f.*,
          COALESCE(f.motorista_nome, m.nome) as motorista_nome,
          COALESCE(f.caminhao_placa, fr.placa) as caminhao_placa,
          m.tipo as motorista_tipo,
          m.telefone as motorista_telefone,
          fr.modelo as caminhao_modelo,
          fr.tipo_veiculo as caminhao_tipo
        FROM fretes f
        LEFT JOIN motoristas m ON m.id = f.motorista_id
        LEFT JOIN frota fr ON fr.id = f.caminhao_id
        WHERE f.id = ?
        LIMIT 1
      `, [id]);
      
      const fretes = rows as unknown[];

      if (fretes.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Frete nao encontrado',
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        message: 'Frete carregado com sucesso',
        data: fretes[0],
      } as ApiResponse<unknown>);
    } catch (error) {
      console.error('❌ [FRETES] Erro ao obter frete:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter frete',
      } as ApiResponse<null>);
    }
  }

  async criar(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('[FRETE][CRIAR][REQ.BODY]', req.body);
      const payload = CriarFreteSchema.parse(req.body);
      console.log('[FRETE][CRIAR][PAYLOAD]', payload);

      const receita =
        payload.receita !== undefined
          ? payload.receita
          : Number(payload.toneladas) * Number(payload.valor_por_tonelada);
      const custos = 0;
      const resultado = Number(receita) - Number(custos);

      // Preparar coluna codigo_frete se ela existir no banco
      const codigoFrete =
        payload.id && typeof payload.id === 'string' ? payload.id : await this.gerarProximoCodigoFrete();
      
      // Tentar inserir com todas as colunas novas
      const sql = `INSERT INTO fretes (
        codigo_frete, origem, destino, motorista_id, motorista_nome, caminhao_id, ticket, numero_nota_fiscal, caminhao_placa,
        fazenda_id, fazenda_nome, mercadoria, variedade, data_frete,
        quantidade_sacas, toneladas, valor_por_tonelada, receita, custos, resultado, pagamento_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        codigoFrete,
        payload.origem,
        payload.destino,
        payload.motorista_id,
        payload.motorista_nome,
        payload.caminhao_id,
        payload.ticket || null,
        payload.numero_nota_fiscal || null,
        payload.caminhao_placa || null,
        payload.fazenda_id || null,
        payload.fazenda_nome || null,
        payload.mercadoria,
        payload.variedade || null,
        payload.data_frete,
        payload.quantidade_sacas,
        payload.toneladas,
        payload.valor_por_tonelada,
        receita,
        custos,
        resultado,
        payload.pagamento_id || null,
      ];

      const [result] = await pool.execute(sql, values);
      const info = result as { insertId: number };

      res.status(201).json({
        success: true,
        message: 'Frete criado com sucesso',
        data: { id: info.insertId, codigo_frete: codigoFrete },
      } as ApiResponse<{ id: number; codigo_frete: string }>);
    } catch (error) {
      if (sendValidationError(res, error)) {
        return;
      }

      // Tratamento especial para colunas faltantes
      const errorMsg = (error as Error).message || '';
      if (errorMsg.includes('Unknown column') || errorMsg.includes('codigo_frete') || errorMsg.includes('numero_nota_fiscal')) {
        console.warn('⚠️ [FRETES][CRIAR] Colunas novas não encontradas. Use o comando ALTER TABLE para adicionar.');
        res.status(400).json({
          success: false,
          message: 'Banco de dados não tem as colunas necessárias. Execute a migration em src/database/migration_add_missing_columns.sql',
          code: 'DB_SCHEMA_OUTDATED'
        });
        return;
      }

      console.error('[FRETE][CRIAR][ERRO 500]', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar frete',
        error: error instanceof Error ? error.message : error
      });
    }
  }

  async atualizar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payload = AtualizarFreteSchema.parse(req.body);
      const data = { ...payload } as Record<string, unknown>;

      if (data.receita === undefined) {
        if (typeof data.toneladas === 'number' && typeof data.valor_por_tonelada === 'number') {
          data.receita = Number(data.toneladas) * Number(data.valor_por_tonelada);
        }
      }

      if (data.receita !== undefined && data.custos !== undefined && data.resultado === undefined) {
        data.resultado = Number(data.receita) - Number(data.custos);
      }

      const { fields, values } = buildUpdate(data, FRETE_FIELDS);
      if (fields.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Nenhum campo valido para atualizar',
        } as ApiResponse<null>);
        return;
      }

      const sql = `UPDATE fretes SET ${fields.join(', ')} WHERE id = ?`;
      values.push(id);
      const [result] = await pool.execute(sql, values);
      const info = result as { affectedRows: number };

      if (info.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'Frete nao encontrado',
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        message: 'Frete atualizado com sucesso',
      } as ApiResponse<null>);
    } catch (error) {
      if (sendValidationError(res, error)) {
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar frete',
      } as ApiResponse<null>);
    }
  }

  async deletar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const [result] = await pool.execute('DELETE FROM fretes WHERE id = ?', [id]);
      const info = result as { affectedRows: number };

      if (info.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'Frete nao encontrado',
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        message: 'Frete removido com sucesso',
      } as ApiResponse<null>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao remover frete',
      } as ApiResponse<null>);
    }
  }
}
