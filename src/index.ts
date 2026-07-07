import cron from 'node-cron';
import { EpisodeService } from './modules/automation/episodeService';
import { ScheduleService } from './modules/automation/scheduleService';
import { TelegramManager, startBot } from './modules/telegram/botManager';
import { logger } from './core/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const TARGET_CHAT_ID = process.env.TELEGRAM_TARGET_CHAT_ID || '';

if (!TARGET_CHAT_ID) {
    logger.warn('TELEGRAM_TARGET_CHAT_ID não definido. Notificações não serão enviadas até ser configurado.');
}

async function processPendingEpisodes() {
    try {
        const episodes = await EpisodeService.getPendingEpisodes();
        
        if (episodes.length === 0) {
            return; // Nada para processar, silêncio na VPS
        }

        logger.info(`Encontrados ${episodes.length} episódios pendentes para notificar no Telegram.`);

        for (const ep of episodes) {
            logger.info(`Processando Notificação: ${ep.nome_obra} - Ep ${ep.numero_ep}`);
            
            // 1. Enviar para o Telegram
            if (TARGET_CHAT_ID) {
                const sent = await TelegramManager.sendEpisodeNotification(TARGET_CHAT_ID, ep);
                
                // 2. Se enviado com sucesso, marcar como processado (Anti-Loop e Anti-Duplicidade)
                if (sent) {
                    await EpisodeService.markAsProcessed(ep.id);
                    logger.info(`Episódio ${ep.id} marcado como notificado com sucesso.`);
                } else {
                    logger.error(`Falha ao notificar episódio ${ep.id}, ele não será marcado como processado e tentaremos novamente na próxima rotina.`);
                }
            } else {
                logger.warn(`Ignorando envio do episódio ${ep.id} por falta de CHAT_ID alvo configurado.`);
            }
        }
    } catch (error) {
        logger.error('Erro no Worker principal de Notificação', error);
    }
}

import { MTProtoManager } from './modules/telegram/mtprotoManager';
import { startApiServer } from './api/server';

// Inicializa a conexão de escuta do Bot (API Oficial)
startBot();

// Inicializa o Servidor de API (Porta 4000)
startApiServer();

// Inicializa a fundação do Userbot (MTProto)
MTProtoManager.initClient();

// Inicia o cron job para notificar o Telegram (roda a cada 1 minuto)
cron.schedule('* * * * *', () => {
    processPendingEpisodes();
});

// NOVO: Inicia o cron job de Inteligência (TMDB) que alimenta a fila do seu Localhost.
// Roda todos os dias às 03:00 da manhã.
cron.schedule('0 3 * * *', () => {
    logger.info('Executando Varredura do TMDB...');
    ScheduleService.syncDailySchedules();
});

// Comente ou apague a linha abaixo em produção. Isso roda a varredura assim que a VPS ligar pra você testar:
setTimeout(() => {
    ScheduleService.syncDailySchedules();
}, 5000);

logger.info('VPS Worker iniciado 24/7 com sucesso! Escutando o Banco de Dados e Vigiando o TMDB...');
