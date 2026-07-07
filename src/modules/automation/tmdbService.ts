import axios from 'axios';
import { logger } from '../../core/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBEpisode {
    id: number;
    name: string;
    episode_number: number;
    season_number: number;
    air_date: string; // YYYY-MM-DD
}

export class TMDBService {
    
    /**
     * Busca uma série de TV pelo nome original (ou alternativo)
     * e retorna o ID dela no TMDB.
     */
    static async searchSeries(seriesName: string): Promise<number | null> {
        if (!TMDB_API_KEY) {
            logger.warn('TMDB_API_KEY não configurada no .env');
            return null;
        }

        try {
            // Limpa o nome (ex: tira "[BL]") para facilitar a busca do TMDB
            const cleanName = seriesName.replace(/\[.*?\]/g, '').trim();
            
            const response = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: cleanName,
                    include_adult: true // Para garantir que séries +18 (uncut) apareçam
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                // Pega o primeiro resultado (o mais relevante)
                return response.data.results[0].id;
            }
            
            return null;
        } catch (error: any) {
            logger.error(`Erro ao buscar série ${seriesName} no TMDB:`, error.message);
            return null;
        }
    }

    /**
     * Busca os episódios de uma série para ver as datas de lançamento
     */
    static async getUpcomingEpisodes(tmdbId: number): Promise<TMDBEpisode[]> {
        if (!TMDB_API_KEY) return [];

        try {
            // Primeiro busca os detalhes da série para saber qual é a temporada atual
            const detailsResponse = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}`, {
                params: { api_key: TMDB_API_KEY }
            });
            
            const seriesData = detailsResponse.data;
            if (!seriesData.seasons || seriesData.seasons.length === 0) return [];
            
            // Pega a última temporada lançada (geralmente a que tem episódios novos)
            const lastSeason = seriesData.seasons[seriesData.seasons.length - 1];
            const seasonNumber = lastSeason.season_number;

            // Agora busca os episódios dessa temporada
            const seasonResponse = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}`, {
                params: { api_key: TMDB_API_KEY }
            });

            const episodes = seasonResponse.data.episodes;
            
            // Filtra os episódios que ainda vão ser lançados ou lançaram hoje
            const today = new Date().toISOString().substring(0, 10);
            const upcoming = episodes.filter((ep: TMDBEpisode) => {
                // Ensure air_date is a valid string before comparison
                return ep.air_date ? ep.air_date >= today : false;
            });

            return upcoming;
        } catch (error: any) {
            logger.error(`Erro ao buscar episódios do TMDB ID ${tmdbId}:`, error.message);
            return [];
        }
    }

    /**
     * Busca o resumo (sinopse) de uma série para enriquecer as postagens
     */
    static async getSeriesSummary(seriesName: string): Promise<string> {
        try {
            const tmdbId = await this.searchSeries(seriesName);
            if (!tmdbId) return "Um novo episódio emocionante de romance e descobertas aguarda você!";
            
            const response = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}`, {
                params: { api_key: TMDB_API_KEY, language: 'pt-BR' }
            });
            
            let overview = response.data.overview;
            if (!overview) return "Um novo episódio emocionante de romance e descobertas aguarda você!";
            
            // Truncate para manter a elegância visual (max 160 chars)
            if (overview.length > 160) {
                // Tenta cortar no último espaço antes do limite
                const truncated = overview.substring(0, 160);
                const lastSpace = truncated.lastIndexOf(' ');
                overview = truncated.substring(0, lastSpace > 0 ? lastSpace : 160) + "...";
            }
            return overview;
        } catch (error) {
            return "Um novo episódio emocionante de romance e descobertas aguarda você!";
        }
    }
}
