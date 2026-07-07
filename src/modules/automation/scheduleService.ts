import { db } from '../../core/db';
import { TMDBService } from './tmdbService';
import { logger } from '../../core/logger';

export class ScheduleService {
    
    /**
     * Roda diariamente para varrer as séries "ongoing" no banco e ver
     * se existe algum episódio no TMDB para ser lançado hoje.
     */
    static async syncDailySchedules() {
        logger.info('Iniciando sincronização diária com o TMDB...');
        
        try {
            // Busca apenas séries em andamento
            const { rows: seriesList } = await db.query("SELECT * FROM series WHERE status = 'ongoing' OR status IS NULL");
            
            for (const series of seriesList) {
                const tmdbId = await TMDBService.searchSeries(series.titulo_original);
                
                if (!tmdbId) {
                    logger.warn(`Série não encontrada no TMDB: ${series.titulo_original}`);
                    continue;
                }

                const upcomingEpisodes = await TMDBService.getUpcomingEpisodes(tmdbId);
                const today = new Date().toISOString().split('T')[0];

                for (const ep of upcomingEpisodes) {
                    // Se o episódio lança HOJE, joga na fila de download
                    if (ep.air_date === today) {
                        await this.addToDownloadQueue(series.titulo_original, ep.episode_number, ep.air_date);
                    }
                }
                
                // Evita rate limit da API do TMDB
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            logger.info('Sincronização diária concluída!');
            
        } catch (error: any) {
            logger.error('Erro na sincronização de metadados:', error.message);
        }
    }

    /**
     * Adiciona um episódio na Fila de Espera para o Localhost (Scraper) abaixar.
     * Verifica antes se já não está na fila.
     */
    private static async addToDownloadQueue(nomeObra: string, numEp: number, dataLancamento: string) {
        try {
            // Verifica se já não colocamos na fila hoje
            const checkQuery = `
                SELECT id FROM download_queue 
                WHERE nome_obra = $1 AND numero_ep = $2
            `;
            const check = await db.query(checkQuery, [nomeObra, numEp]);
            
            if (check.rows.length === 0) {
                const insertQuery = `
                    INSERT INTO download_queue (nome_obra, numero_ep, data_lancamento, status)
                    VALUES ($1, $2, $3, 'pending')
                `;
                await db.query(insertQuery, [nomeObra, numEp, dataLancamento]);
                logger.info(`[Fila de Download] Inserido: ${nomeObra} - Ep ${numEp}`);
            }
        } catch (error: any) {
            logger.error(`Erro ao inserir na fila de download para ${nomeObra}:`, error.message);
        }
    }
}
