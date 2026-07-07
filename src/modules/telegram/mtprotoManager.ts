import { Api, TelegramClient } from 'telegram';
import { NewMessage } from 'telegram/events';
import { StringSession } from 'telegram/sessions';
import { logger } from '../../core/logger';
import { db } from '../../core/db';
import * as dotenv from 'dotenv';

dotenv.config();

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';

export class MTProtoManager {
    private static client: TelegramClient | null = null;
    private static stringSession = new StringSession('');
    
    // State machine resolvers
    private static resolvePhoneCode: ((code: string) => void) | null = null;
    private static resolvePassword: ((pwd: string) => void) | null = null;
    private static isLoggingIn = false;

    static isConnected = false;

    static async initClient() {
        if (!API_ID || !API_HASH) {
            logger.warn('⚠️ API_ID ou API_HASH ausentes. O MTProto não pode iniciar.');
            return;
        }

        try {
            // Tenta carregar uma sessão do banco
            const res = await db.query(`SELECT session_string FROM telegram_sessions ORDER BY created_at DESC LIMIT 1`);
            if (res.rows.length > 0) {
                logger.info('Carregando sessão existente do Banco de Dados...');
                this.stringSession = new StringSession(res.rows[0].session_string);
            }

            this.client = new TelegramClient(this.stringSession, API_ID, API_HASH, {
                connectionRetries: 5,
            });
            
            await this.client.connect();
            
            const isAuth = await this.client.checkAuthorization();
            if (isAuth) {
                logger.info('✅ MTProto Autenticado e Pronto!');
                this.isConnected = true;
                this.setupAnalyticsListeners();
            } else {
                logger.info('🟡 MTProto não autenticado. Aguardando login via Painel SaaS.');
            }
        } catch (error: any) {
            logger.error('Erro fatal ao iniciar MTProto: ' + error.message);
        }
    }

    static setupAnalyticsListeners() {
        if (!this.client) return;

        this.client.addEventHandler(async (event: any) => {
            try {
                const message = event.message;
                if (!message) return;
                
                const chatId = message.peerId?.chatId || message.peerId?.channelId;
                if (!chatId) return;

                // 1. Processa Eventos de Ação (Analytics)
                if (message.action) {
                    if (message.action instanceof Api.MessageActionChatAddUser || message.action instanceof Api.MessageActionChatJoinedByLink) {
                        await db.query(`INSERT INTO analytics_events (event_type, chat_id) VALUES ('join', $1)`, [String(chatId)]);
                        logger.info(`Analytics: Novo usuário entrou no chat ${chatId}`);
                    } 
                    else if (message.action instanceof Api.MessageActionChatDeleteUser) {
                        await db.query(`INSERT INTO analytics_events (event_type, chat_id) VALUES ('leave', $1)`, [String(chatId)]);
                        logger.info(`Analytics: Usuário saiu do chat ${chatId}`);
                    }
                    return;
                }

                // 2. Processa Mensagens Normais (Sistema de Clone/Backup)
                const targetChatId = process.env.TELEGRAM_TARGET_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
                const targetClean = targetChatId?.replace('-100', '');
                
                if (String(chatId) === targetClean) {
                    // É uma mensagem no canal principal!
                    const settingsActive = await db.query(`SELECT value FROM system_settings WHERE key = 'backup_active'`);
                    if (settingsActive.rows[0]?.value === 'true') {
                        const settingsChat = await db.query(`SELECT value FROM system_settings WHERE key = 'backup_chat_id'`);
                        const backupChatId = settingsChat.rows[0]?.value;
                        if (backupChatId) {
                            try {
                                const { bot } = require('./botManager');
                                // Usa o Bot API nativo para copiar a mensagem com qualidade 100% (file_id) e sem tag "Encaminhado"
                                await bot.telegram.copyMessage(backupChatId, targetChatId, message.id);
                                logger.info(`🛡️ Backup: Mensagem ${message.id} clonada para o canal de segurança.`);
                            } catch (cloneErr: any) {
                                logger.error(`🛡️ Erro ao clonar mensagem para o Backup: ${cloneErr.message}`);
                            }
                        }
                    }
                }

            } catch (err) {
                logger.error('Erro no Analytics/Backup MTProto:', err);
            }
        }, new NewMessage({}));
        logger.info('🎧 Sensores de Telemetria e Clone de Segurança ativados no MTProto.');
    }

    static getClient() {
        return this.client;
    }

    static async requestLoginCode(phone: string): Promise<void> {
        if (!this.client) throw new Error('Cliente MTProto não inicializado.');
        
        this.isLoggingIn = true;
        logger.info(`Solicitando código para ${phone}...`);

        // Dispara o fluxo assíncrono do GramJS no background
        this.client.start({
            phoneNumber: async () => phone,
            password: async () => {
                return new Promise((resolve) => {
                    logger.info('Aguardando senha 2FA...');
                    this.resolvePassword = resolve;
                });
            },
            phoneCode: async () => {
                return new Promise((resolve) => {
                    logger.info('Aguardando código SMS/Telegram...');
                    this.resolvePhoneCode = resolve;
                });
            },
            onError: (err) => logger.error(`GramJS Erro: ${err.message}`),
        }).then(async () => {
            logger.info('✅ Login MTProto realizado com sucesso!');
            this.isLoggingIn = false;
            this.isConnected = true;
            
            // Salva a sessão no banco
            const sessionStr = this.client?.session.save() as unknown as string;
            await db.query(`INSERT INTO telegram_sessions (phone, session_string) VALUES ($1, $2)`, [phone, sessionStr]);
            logger.info('Sessão salva no Supabase.');
        }).catch((err) => {
            logger.error(`Falha no login: ${err.message}`);
            this.isLoggingIn = false;
        });
    }

    static submitLoginCode(code: string): void {
        if (this.resolvePhoneCode) {
            this.resolvePhoneCode(code);
            this.resolvePhoneCode = null; // Clear resolver
        } else {
            throw new Error('Nenhum código sendo aguardado no momento.');
        }
    }

    static submitPassword(password: string): void {
        if (this.resolvePassword) {
            this.resolvePassword(password);
            this.resolvePassword = null;
        } else {
            throw new Error('Nenhuma senha sendo aguardada no momento.');
        }
    }

    static getAuthStep(): string {
        if (this.isConnected) return 'success';
        if (this.resolvePassword) return 'waiting_password';
        if (this.resolvePhoneCode) return 'waiting_code';
        if (this.isLoggingIn) return 'loading_code';
        return 'idle';
    }
}
