const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = 4001;

app.use(cors());
app.use(express.json());

const processes = {
    gagaoolala: null,
    iqiyi: null
};

// Store last 100 log lines per process
const processLogs = {
    gagaoolala: [],
    iqiyi: []
};

function addLog(system, type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] [${type}] ${message.trim()}`;
    processLogs[system].push(logLine);
    if (processLogs[system].length > 100) {
        processLogs[system].shift();
    }
}

const config = {
    gagaoolala: {
        cwd: "C:\\Users\\Dumbola\\Desktop\\BL's\\sistema_gagaoolala",
        script: 'run_vps2.py'
    },
    iqiyi: {
        cwd: "C:\\Users\\Dumbola\\Desktop\\BL's\\sistema_iqiyi",
        script: 'run_vps.py'
    }
};

app.get('/api/automation/status', (req, res) => {
    res.json({
        gagaoolala: {
            running: !!processes.gagaoolala,
            logs: processLogs.gagaoolala
        },
        iqiyi: {
            running: !!processes.iqiyi,
            logs: processLogs.iqiyi
        }
    });
});

app.post('/api/automation/start/:system', (req, res) => {
    const system = req.params.system;
    
    if (!config[system]) {
        return res.status(400).json({ error: 'Sistema inválido' });
    }

    if (processes[system]) {
        return res.status(400).json({ error: 'Sistema já está rodando' });
    }

    try {
        processLogs[system] = []; // clear logs on start
        addLog(system, 'INFO', `Iniciando scraper: ${config[system].script}...`);
        
        const child = spawn('python', [config[system].script], {
            cwd: config[system].cwd,
            env: process.env // Inherit env
        });

        child.stdout.on('data', (data) => {
            addLog(system, 'STDOUT', data.toString());
        });

        child.stderr.on('data', (data) => {
            addLog(system, 'STDERR', data.toString());
        });

        child.on('close', (code) => {
            addLog(system, 'INFO', `Processo encerrado com código ${code}`);
            processes[system] = null;
        });

        child.on('error', (err) => {
            addLog(system, 'ERROR', `Erro ao iniciar processo: ${err.message}`);
            processes[system] = null;
        });

        processes[system] = child;
        res.json({ success: true, message: `${system} iniciado` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/automation/stop/:system', (req, res) => {
    const system = req.params.system;
    
    if (!config[system]) {
        return res.status(400).json({ error: 'Sistema inválido' });
    }

    if (!processes[system]) {
        return res.status(400).json({ error: 'Sistema não está rodando' });
    }

    try {
        addLog(system, 'INFO', 'Enviando sinal de parada...');
        // On Windows, child.kill() might just kill the parent. 
        // We'll try normal SIGTERM first.
        processes[system].kill();
        res.json({ success: true, message: `${system} sinalizado para parar` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Local Worker rodando na porta ${port}`);
});
