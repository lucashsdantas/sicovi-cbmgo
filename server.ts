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
      let maxId = 0;
      const cleanRegs: any[] = [];
      if (Array.isArray(parsed.registros)) {
        parsed.registros.forEach((r: any) => {
          const num = Number(r.id);
          // Filtra registro fantasma de teste 113614 ou IDs anômalos
          if (String(r.id) === '113614' || num >= 100000) return;
          cleanRegs.push(r);
          if (!isNaN(num) && num > maxId) maxId = num;
        });
      }
      const prox = maxId > 0 ? maxId + 1 : 1;
      return { ...initialDb, ...parsed, registros: cleanRegs, proximoId: prox };
    }
  } catch (err) {
    console.error('Erro ao ler database.json:', err);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

function writeDb(data: Partial<ServerDatabase> & { modo?: 'adicionar' | 'substituir' }): ServerDatabase {
  const current = readDb();
  let maxId = 0;
  let regs = current.registros;

  if (Array.isArray(data.registros)) {
    // Filtra o ID fantasma de teste 113614 ou IDs espúrios >= 100000
    const limpados = data.registros.filter((r: any) => String(r.id) !== '113614' && (isNaN(Number(r.id)) || Number(r.id) < 100000));
    if (data.modo === 'substituir') {
      regs = limpados;
    } else {
      // Mesclagem por ID: atualiza existentes ou insere novos
      const map = new Map<number | string, any>();
      if (Array.isArray(current.registros)) {
        current.registros.forEach(r => map.set(String(r.id), r));
      }
      limpados.forEach(r => map.set(String(r.id), r));
      regs = Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id));
    }
  }

  if (Array.isArray(regs)) {
    regs.forEach((r: any) => {
      const num = Number(r.id);
      if (!isNaN(num) && num < 100000 && num > maxId) maxId = num;
    });
  }

  const prox = maxId > 0 ? maxId + 1 : 1;
  const updated: ServerDatabase = {
    ...current,
    ...data,
    registros: regs,
    proximoId: prox,
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

app.get('/api/db/proximo-id', (_req, res) => {
  try {
    const current = readDb();
    let maxId = 0;
    if (Array.isArray(current.registros)) {
      current.registros.forEach((r: any) => {
        const num = Number(r.id);
        if (!isNaN(num) && num < 100000 && num > maxId) maxId = num;
      });
    }
    const nextId = maxId > 0 ? maxId + 1 : 1;
    res.json({ success: true, proximoId: nextId, maiorId: maxId });
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

app.post('/api/db/delete-registro', (req, res) => {
  try {
    const { id } = req.body;
    if (id === undefined || id === null) {
      return res.status(400).json({ success: false, error: 'ID do registro não informado.' });
    }
    const current = readDb();
    const idStr = String(id).trim();
    const filtrados = (current.registros || []).filter(
      (r: any) => String(r.id).trim() !== idStr && Number(r.id) !== Number(idStr)
    );

    let maxId = 0;
    filtrados.forEach((r: any) => {
      const num = Number(r.id);
      if (!isNaN(num) && num < 100000 && num > maxId) maxId = num;
    });
    const prox = maxId > 0 ? maxId + 1 : 1;

    const updated: ServerDatabase = {
      ...current,
      registros: filtrados,
      proximoId: prox,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    res.json({ success: true, proximoId: prox, registrosRestantes: filtrados.length });
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
