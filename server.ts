import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data folder and database.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerDatabase {
  viaturas: any[];
  militares: string[];
  operadoresSenhas: Record<string, string>;
  registros: any[];
  bairros: string[];
  destinos: string[];
  escalas: any[];
  proximoId: number;
  supabaseConfig: { url: string; anonKey: string };
  updatedAt: string;
}

const initialDb: ServerDatabase = {
  viaturas: [],
  militares: ['2º Sgt Dantas'],
  operadoresSenhas: { '2º Sgt Dantas': '123456' },
  registros: [],
  bairros: [
    'Centro',
    'Setor Bueno',
    'Jardim Goiás',
    'Marista',
    'Campinas',
    'Setor Sul',
    'Setor Oeste',
    'Vila Nova',
    'Jardim América'
  ],
  destinos: ['Ocorrência', 'Vistorias', 'Serviço da OBM', 'Diversos', 'Abastecimento'],
  escalas: [],
  proximoId: 1,
  supabaseConfig: {
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || ''
  },
  updatedAt: new Date().toISOString()
};

function readDb(): ServerDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...initialDb, ...parsed };
    }
  } catch (err) {
    console.error('Erro ao ler database.json:', err);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

function writeDb(data: Partial<ServerDatabase>): ServerDatabase {
  const current = readDb();
  const updated: ServerDatabase = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

// REST API for Centralized Data Storage across all machines & devices
app.get('/api/db', (_req, res) => {
  try {
    const data = readDb();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db/save', (req, res) => {
  try {
    const payload = req.body;
    const updated = writeDb(payload);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db/reset', (_req, res) => {
  try {
    const current = readDb();
    const resetData: ServerDatabase = {
      ...initialDb,
      militares: current.militares,
      operadoresSenhas: current.operadoresSenhas,
      supabaseConfig: current.supabaseConfig,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(resetData, null, 2), 'utf-8');
    res.json({ success: true, message: 'Banco de dados reinicializado no servidor!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SICOVI Central Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
