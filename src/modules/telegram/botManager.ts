import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import { logger } from '../../core/logger';
import { Episode } from '../automation/episodeService';
import { TMDBService } from '../automation/tmdbService';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
    logger.error('TELEGRAM_BOT_TOKEN não encontrado no .env');
    process.exit(1);
}

export const bot = new Telegraf(TOKEN);

export class TelegramManager {
    static async sendEpisodeNotification(chatId: string | number, episode: Episode): Promise<boolean> {
        try {
            // Busca o resumo da série automaticamente com a IA do TMDB Service
            const summary = await TMDBService.getSeriesSummary(episode.nome_obra);

            const message = `✦ ⊹ ࣪ ˖ 【 *${episode.nome_obra}* 】 ˖ ࣪ ⊹ ✦\n` +
                            `🌸 _Episódio ${episode.numero_ep} já disponível!_\n\n` +
                            `❝ _${summary}_ ❞\n\n` +
                            ` ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤\n` +
                            `🍿 *Qualidade:* 4K Ultra | Legendado PT-BR\n` +
                            `💌 _Trazido com muito carinho para a nossa comunidade._\n\n` +
                            `🔗 [ Assistir Agora ](${episode.link})`;
            
            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
            // Analytics: Registrar envio com sucesso
            const { db } = require('../../core/db');
            await db.query(`INSERT INTO analytics_events (event_type, chat_id) VALUES ('broadcast', $1)`, [String(chatId)]);

            return true;
        } catch (error) {
            logger.error(`Erro ao enviar notificação para o chat ${chatId}`, error);
            return false;
        }
    }
    
    static async adjustGroupPermissions(chatId: string | number) {
        try {
            await bot.telegram.setChatPermissions(chatId, {
                can_send_messages: false // Transforma o grupo em modo leitura para membros (canal de anúncios)
            });
            logger.info(`Permissões do grupo ${chatId} ajustadas.`);
        } catch (error) {
            logger.error(`Erro ao ajustar permissões do chat ${chatId}`, error);
        }
    }
}

// Inicia o bot para lidar com comandos básicos ou gerenciamento de estado
export function startBot() {
    // REMOVIDO: bot.launch()
    // Como o seu Localhost já escuta os comandos do Telegram (Polling),
    // se a VPS tentar escutar também, o Telegram bloqueia um dos dois (Erro 409 Conflict).
    // Agora a VPS vai atuar APENAS como "Emissora" de mensagens. Ela manda a mensagem 
    // e vai embora, deixando o seu Localhost reinar em paz na leitura de mensagens!
    
    logger.info('Bot do Telegram configurado no modo Emissor (Sem Polling). Harmonia com Localhost ativada!');
}
