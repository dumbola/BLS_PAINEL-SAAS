import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    logger.error('DATABASE_URL não encontrada no .env');
    process.exit(1);
}

// Inicializa o Pool de conexão do PostgreSQL
export const db = new Pool({
    connectionString: DATABASE_URL,
    // Em alguns casos de VPS/Cloud, pode ser necessário ssl: { rejectUnauthorized: false }
    // Mas vamos começar sem, e se houver erro de SSL, basta habilitar abaixo
    // ssl: { rejectUnauthorized: false }
});

// Testa a conexão ao iniciar
db.connect()
    .then(client => {
        logger.info('Conectado ao PostgreSQL com sucesso!');
        client.release();
    })
    .catch(err => {
        logger.error('Erro ao conectar no PostgreSQL:', err.message);
    });
