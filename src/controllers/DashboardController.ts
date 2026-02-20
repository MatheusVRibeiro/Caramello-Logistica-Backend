import { Response } from 'express';
import pool from '../database/connection';
import { ApiResponse, AuthRequest } from '../types';
import { getCache, setCache } from '../utils/cache';

const CACHE_TTL_SECONDS = Number(process.env.REDIS_TTL || 60);

export class DashboardController {
  async obterKPIs(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const cacheKey = 'dashboard:kpis';
      const cached = await getCache<Record<string, number>>(cacheKey);
      if (cached) {
        res.json({
          success: true,
          message: 'KPIs carregados com sucesso (cache)',
          data: cached,
        } as ApiResponse<Record<string, number>>);
        return;
      }

      const [freteRows] = await pool.execute(
        `SELECT 
          COALESCE(SUM(receita), 0) AS receita_total,
          COALESCE(SUM(custos), 0) AS custos_total,
          COALESCE(SUM(receita - custos), 0) AS lucro_total,
          COUNT(*) AS total_fretes
        FROM fretes`
      );

      const [motoristaRows] = await pool.execute(
        "SELECT COUNT(*) AS motoristas_ativos FROM motoristas WHERE status = 'ativo'"
      );

      const [frotaRows] = await pool.execute(
        "SELECT COUNT(*) AS caminhoes_disponiveis FROM frota WHERE status = 'disponivel'"
      );

      const frete = (freteRows as Array<{ receita_total: number; custos_total: number; lucro_total: number; total_fretes: number }>)[0];
      const motoristas = (motoristaRows as Array<{ motoristas_ativos: number }>)[0];
      const frota = (frotaRows as Array<{ caminhoes_disponiveis: number }>)[0];

      const margemLucro = frete.receita_total > 0
        ? Number(((frete.lucro_total / frete.receita_total) * 100).toFixed(2))
        : 0;

      const data = {
        receitaTotal: frete.receita_total,
        custosTotal: frete.custos_total,
        lucroTotal: frete.lucro_total,
        margemLucro,
        totalFretes: frete.total_fretes,
        motoristasAtivos: motoristas.motoristas_ativos,
        caminhoesDisponiveis: frota.caminhoes_disponiveis,
      };

      await setCache(cacheKey, data, CACHE_TTL_SECONDS);

      res.json({
        success: true,
        message: 'KPIs carregados com sucesso',
        data,
      } as ApiResponse<Record<string, number>>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar KPIs',
      } as ApiResponse<null>);
    }
  }

  async obterEstatisticasPorRota(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const cacheKey = 'dashboard:estatisticas-rotas';
      const cached = await getCache<unknown[]>(cacheKey);
      if (cached) {
        res.json({
          success: true,
          message: 'Estatisticas por rota carregadas com sucesso (cache)',
          data: cached,
        } as ApiResponse<unknown>);
        return;
      }

      const [rows] = await pool.execute(
        `SELECT 
          origem,
          destino,
          COUNT(*) AS total_fretes,
          COALESCE(SUM(receita), 0) AS receita_total,
          COALESCE(SUM(custos), 0) AS custos_total,
          COALESCE(SUM(receita - custos), 0) AS lucro_total
        FROM fretes
        GROUP BY origem, destino
        ORDER BY lucro_total DESC`
      );

      await setCache(cacheKey, rows, CACHE_TTL_SECONDS);

      res.json({
        success: true,
        message: 'Estatisticas por rota carregadas com sucesso',
        data: rows,
      } as ApiResponse<unknown>);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao carregar estatisticas por rota',
      } as ApiResponse<null>);
    }
  }
}
