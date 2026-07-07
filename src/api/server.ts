import express from 'express';
import cors from 'cors';
import { MTProtoManager } from '../modules/telegram/mtprotoManager';
import { logger } from '../core/logger';

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(cors());
app.use(express.json());

// Endpoints para o fluxo MTProto
app.post('/api/auth/login', (req, res) => {
    try {
        const { password } = req.body;
        const saasPassword = process.env.SAAS_PASSWORD || 'admin123';
        
        if (password === saasPassword) {
            // Em um app de produção usaríamos JWT, aqui como é privado e simples, só retornamos sucesso. O Front vai guardar o estado.
            return res.json({ success: true, token: 'saas_auth_token_30d' });
        } else {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }
    } catch (error: any) {
        return res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const { db } = require('../core/db');
        // Conta total de broadcasts
        const broadcastRes = await db.query(`SELECT COUNT(*) FROM analytics_events WHERE event_type = 'broadcast'`);
        const broadcasts = parseInt(broadcastRes.rows[0].count);

        // Conta total de Joins e Leaves
        const joinsRes = await db.query(`SELECT COUNT(*) FROM analytics_events WHERE event_type = 'join'`);
        const leavesRes = await db.query(`SELECT COUNT(*) FROM analytics_events WHERE event_type = 'leave'`);
        const joins = parseInt(joinsRes.rows[0].count);
        const leaves = parseInt(leavesRes.rows[0].count);

        // Usuários ativos (Leads) calculados como a diferença
        const activeLeads = joins - leaves;

        // Opcional: contar status do MTProto
        const isMTProtoConnected = MTProtoManager.getClient() ? true : false;
        const authStep = MTProtoManager.getAuthStep();

        return res.json({
            broadcasts,
            joins,
            leaves,
            activeLeads,
            isMTProtoConnected,
            authStep
        });
    } catch (error: any) {
        logger.error(error);
        return res.status(500).json({ error: 'Erro ao buscar analytics' });
    }
});

app.get('/api/series', async (req, res) => {
    try {
        const { db } = require('../core/db');
        const query = `
            SELECT 
                s.id, 
                s.titulo_original as name, 
                s.source_url as link, 
                s.status_exibicao,
                COUNT(e.id) as total_episodes,
                COUNT(CASE WHEN e.status = 'pending' THEN 1 END) as pending_episodes
            FROM series s
            LEFT JOIN episodes e ON e.series_id = s.id
            GROUP BY s.id
            ORDER BY s.id DESC;
        `;
        const result = await db.query(query);
        
        return res.json({
            success: true,
            totalSeries: result.rows.length,
            series: result.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                link: row.link,
                statusExibicao: row.status_exibicao,
                totalEpisodes: parseInt(row.total_episodes),
                pendingEpisodes: parseInt(row.pending_episodes),
                // Computa status final para a tabela
                status: parseInt(row.pending_episodes) > 0 ? 'missing_upload' : (parseInt(row.total_episodes) === 0 ? 'no_episodes' : 'updated')
            }))
        });
    } catch (error: any) {
        logger.error(error);
        return res.status(500).json({ error: 'Erro ao buscar series' });
    }
});

app.get('/api/backup/config', async (req, res) => {
    try {
        const { db } = require('../core/db');
        const activeRes = await db.query(`SELECT value FROM system_settings WHERE key = 'backup_active'`);
        const chatIdRes = await db.query(`SELECT value FROM system_settings WHERE key = 'backup_chat_id'`);
        
        return res.json({
            success: true,
            active: activeRes.rows[0]?.value === 'true',
            chatId: chatIdRes.rows[0]?.value || ''
        });
    } catch (error: any) {
        logger.error(error);
        return res.status(500).json({ error: 'Erro ao buscar config de backup' });
    }
});

app.post('/api/backup/config', async (req, res) => {
    try {
        const { db } = require('../core/db');
        const { active, chatId } = req.body;
        
        await db.query(`
            INSERT INTO system_settings (key, value) VALUES ('backup_active', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [String(active)]);

        await db.query(`
            INSERT INTO system_settings (key, value) VALUES ('backup_chat_id', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [String(chatId)]);

        return res.json({ success: true });
    } catch (error: any) {
        logger.error(error);
        return res.status(500).json({ error: 'Erro ao salvar config de backup' });
    }
});

export const startApiServer = () => {
    app.listen(PORT, () => {
        logger.info(`🚀 API Server do SaaS rodando na porta ${PORT}`);
    });
};
