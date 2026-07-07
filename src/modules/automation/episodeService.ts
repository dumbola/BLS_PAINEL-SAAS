import { db } from '../../core/db';
import { logger } from '../../core/logger';

export interface Episode {
    id: string;
    nome_obra: string;
    numero_ep: number;
    data_lancamento: Date;
    horario_lancamento: string;
    link: string;
    processado: boolean;
}

export class EpisodeService {
    
    /**
     * Busca episódios que ainda não foram processados
     */
    static async getPendingEpisodes(): Promise<Episode[]> {
        try {
            // Busca Inteligente:
            // 1. O nome_obra contém o titulo_original? (Ex: "Solo Leveling 2" -> "Solo Leveling")
            // 2. O titulo_original contém o nome_obra? (Ex: "[BL] About Youth" -> "About Youth")
            // 3. Similaridade Trigram (Lida com pequenos erros de digitação, ignorando pontuação)
            const query = `
                SELECT DISTINCT el.* 
                FROM episodios_lancamentos el
                INNER JOIN series s 
                  ON el.nome_obra ILIKE '%' || s.titulo_original || '%'
                  OR s.titulo_original ILIKE '%' || el.nome_obra || '%'
                  OR similarity(s.titulo_original, el.nome_obra) > 0.4
                WHERE el.processado = false
            `;
            const { rows } = await db.query(query);
            
            // Formatando as datas/horas retornadas se necessário
            return rows.map(row => ({
                ...row,
                // Garantimos a string correta se o driver do PG retornar Date object para DATE type
                data_lancamento: row.data_lancamento instanceof Date 
                    ? row.data_lancamento.toISOString().split('T')[0] 
                    : row.data_lancamento
            })) as Episode[];
        } catch (error: any) {
            logger.error('Erro ao buscar episódios pendentes', error.message);
            return [];
        }
    }

    /**
     * Marca um episódio como processado para evitar loops e duplicidades (Lógica Anti-Loop)
     */
    static async markAsProcessed(episodeId: string): Promise<boolean> {
        try {
            const query = `
                UPDATE episodios_lancamentos 
                SET processado = true 
                WHERE id = $1
            `;
            await db.query(query, [episodeId]);
            return true;
        } catch (error: any) {
            logger.error(`Erro ao marcar episódio ${episodeId} como processado`, error.message);
            return false;
        }
    }
}
