import { Request, Response } from 'express';
import { ZodError } from 'zod';
import pool from '../database/connection';
import { ApiResponse } from '../types';
import { buildUpdate } from '../utils/sql';
import { AtualizarPagamentoSchema, CriarPagamentoSchema } from '../utils/validators';

const PAGAMENTO_FIELDS = [
  'motorista_id',
  'motorista_nome',
  'periodo_fretes',
  'quantidade_fretes',
  'fretes_incluidos',
  'total_toneladas',
  'valor_por_tonelada',
  'valor_total',
  'data_pagamento',
  'status',
  'metodo_pagamento',
  'comprovante_nome',
  'comprovante_url',
  'comprovante_data_upload',
  'observacoes',
];

export class PagamentoController {
  // Gerar próximo ID sequencial de pagamento (PAG-2026-001, PAG-2026-002...)
  private async gerarProximoIdPagamento(): Promise<string> {
    const anoAtual = new Date().getFullYear();
    const prefixo = `PAG-${anoAtual}-`;

    // Buscar o último pagamento do ano atual
    const [rows] = await pool.execute(
      `SELECT id FROM pagamentos WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
      [`${prefixo}%`]
    );

    const pagamentos = rows as Array<{ id: string }>;

    if (pagamentos.length === 0) {
      // Primeiro pagamento do ano
      return `${prefixo}001`;
    }

    // Extrair número sequencial do último ID (PAG-2026-001 -> 001)
    const ultimoId = pagamentos[0].id;
    const ultimoNumero = parseInt(ultimoId.split('-')[2], 10);
    const proximoNumero = ultimoNumero + 1;

    // Formatar com 3 dígitos (001, 002, ..., 999)
    return `${prefixo}${proximoNumero.toString().padStart(3, '0')}`;
  }

  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute('SELECT * FROM pagamentos ORDER BY created_at DESC');
      res.json({
        success: true,
        message: 'Pagamentos listados com sucesso',
        data: rows,
      } as ApiResponse<unknown>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao listar pagamentos',
      } as ApiResponse<null>);
    }
  }

  async obterPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute('SELECT * FROM pagamentos WHERE id = ? LIMIT 1', [id]);
      const pagamentos = rows as unknown[];

      if (pagamentos.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Pagamento nao encontrado',
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        message: 'Pagamento carregado com sucesso',
        data: pagamentos[0],
      } as ApiResponse<unknown>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao obter pagamento',
      } as ApiResponse<null>);
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const payload = CriarPagamentoSchema.parse(req.body);
      const id = payload.id || (await this.gerarProximoIdPagamento());
      const status = payload.status || 'pendente';

      await pool.execute(
        `INSERT INTO pagamentos (
          id, motorista_id, motorista_nome, periodo_fretes, quantidade_fretes, fretes_incluidos,
          total_toneladas, valor_por_tonelada, valor_total, data_pagamento, status, metodo_pagamento,
          comprovante_nome, comprovante_url, comprovante_data_upload, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          payload.motorista_id,
          payload.motorista_nome,
          payload.periodo_fretes,
          payload.quantidade_fretes,
          payload.fretes_incluidos || null,
          payload.total_toneladas,
          payload.valor_por_tonelada,
          payload.valor_total,
          payload.data_pagamento,
          status,
          payload.metodo_pagamento,
          payload.comprovante_nome || null,
          payload.comprovante_url || null,
          payload.comprovante_data_upload || null,
          payload.observacoes || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Pagamento criado com sucesso',
        data: { id },
      } as ApiResponse<{ id: string }>);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dados invalidos',
          error: error.errors.map((err) => err.message).join('; '),
        } as ApiResponse<null>);
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao criar pagamento',
      } as ApiResponse<null>);
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payload = AtualizarPagamentoSchema.parse(req.body);
      const { fields, values } = buildUpdate(payload as Record<string, unknown>, PAGAMENTO_FIELDS);

      if (fields.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Nenhum campo valido para atualizar',
        } as ApiResponse<null>);
        return;
      }

      const sql = `UPDATE pagamentos SET ${fields.join(', ')} WHERE id = ?`;
      values.push(id);
      const [result] = await pool.execute(sql, values);
      const info = result as { affectedRows: number };

      if (info.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'Pagamento nao encontrado',
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        message: 'Pagamento atualizado com sucesso',
      } as ApiResponse<null>);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Dados invalidos',
          error: error.errors.map((err) => err.message).join('; '),
        } as ApiResponse<null>);
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar pagamento',
      } as ApiResponse<null>);
    }
  }

  async deletar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const [result] = await pool.execute('DELETE FROM pagamentos WHERE id = ?', [id]);
      const info = result as { affectedRows: number };

      if (info.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'Pagamento nao encontrado',
        } as ApiResponse<null>);
        return;
      }

      res.json({
        success: true,
        message: 'Pagamento removido com sucesso',
      } as ApiResponse<null>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao remover pagamento',
      } as ApiResponse<null>);
    }
  }

  async uploadComprovante(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verificar se o pagamento existe
      const [pagamentos] = await pool.execute('SELECT * FROM pagamentos WHERE id = ? LIMIT 1', [
        id,
      ]);
      const pagamentoArray = pagamentos as unknown[];

      if (pagamentoArray.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Pagamento não encontrado',
        } as ApiResponse<null>);
        return;
      }

      // Verificar se o arquivo foi enviado
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado',
        } as ApiResponse<null>);
        return;
      }

      const { filename, mimetype, size, originalname } = req.file;
      // anexoId deve ser gerado pelo banco ou outro mecanismo
      const fileUrl = `/uploads/${filename}`;

      // Usar transação para garantir atomicidade
      const conn = await pool.getConnection();
      let anexoId: string = '';
      try {
        await conn.beginTransaction();
        // 1. INSERT sem ID manual
        const [result]: any = await conn.execute(
          `INSERT INTO anexos (
            nome_original, nome_arquivo, url, tipo_mime, tamanho,
            entidade_tipo, entidade_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [originalname, filename, fileUrl, mimetype, size, 'pagamento', id]
        );
        const insertId = result.insertId;
        // 2. Geração da sigla/código
        const ano = new Date().getFullYear();
        anexoId = `ANX-${ano}-${String(insertId).padStart(3, '0')}`;
        await conn.execute('UPDATE anexos SET id = ? WHERE id = ?', [anexoId, insertId]);

        // Atualizar pagamento com dados do comprovante
        await conn.execute(
          `UPDATE pagamentos SET 
            comprovante_nome = ?,
            comprovante_url = ?,
            comprovante_data_upload = NOW()
          WHERE id = ?`,
          [originalname, fileUrl, id]
        );

        await conn.commit();

        res.status(200).json({
          success: true,
          message: 'Comprovante enviado com sucesso',
          data: {
            anexoId,
            filename,
            url: fileUrl,
            originalname,
          },
        } as ApiResponse<{
          anexoId: string;
          filename: string;
          url: string;
          originalname: string;
        }>);
        return;
      } catch (txError) {
        await conn.rollback();
        res.status(500).json({
          success: false,
          message: 'Erro ao salvar comprovante (transação).',
        } as ApiResponse<null>);
        return;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Erro ao fazer upload do comprovante:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer upload do comprovante',
      } as ApiResponse<null>);
    }
  }
}
