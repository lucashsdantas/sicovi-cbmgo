import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from Vite environment, central server, or localStorage override
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const localUrl = (typeof window !== 'undefined' ? localStorage.getItem('sicovi_supabase_url') || '' : '').trim();
  const localKey = (typeof window !== 'undefined' ? localStorage.getItem('sicovi_supabase_anon_key') || '' : '').trim();

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function saveSupabaseConfig(url: string, anonKey: string) {
  const u = (url || '').trim();
  const k = (anonKey || '').trim();

  if (typeof window !== 'undefined') {
    if (u) {
      localStorage.setItem('sicovi_supabase_url', u);
    } else {
      localStorage.removeItem('sicovi_supabase_url');
    }

    if (k) {
      localStorage.setItem('sicovi_supabase_anon_key', k);
    } else {
      localStorage.removeItem('sicovi_supabase_anon_key');
    }
  }

  // Invalidate cached client immediately
  supabaseInstance = null;
  currentClientUrl = '';
  currentClientKey = '';

  try {
    if (typeof window !== 'undefined') {
      fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseConfig: { url: u, anonKey: k } })
      }).catch(err => console.warn('Erro ao salvar config do Supabase no backend central:', err));
    }
  } catch {}
}

export async function saveSupabaseConfigAsync(url: string, anonKey: string): Promise<boolean> {
  saveSupabaseConfig(url, anonKey);
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseConfig: { url: (url || '').trim(), anonKey: (anonKey || '').trim() } })
      });
      return res.ok;
    }
  } catch {
    return false;
  }
  return true;
}

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  // Se URL ou chave mudaram, recria a instância
  if (!supabaseInstance || currentClientUrl !== url || currentClientKey !== anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey);
      currentClientUrl = url;
      currentClientKey = anonKey;
    } catch (e) {
      console.warn('Erro ao inicializar cliente Supabase:', e);
      supabaseInstance = null;
      return null;
    }
  }

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

export async function testarConexaoSupabase(): Promise<{ success: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) {
    return {
      success: false,
      message: 'Supabase não configurado. Defina a URL e a Anon Key no painel gerencial ou no arquivo .env.'
    };
  }

  try {
    const { error } = await sb.from('viaturas').select('count', { count: 'exact', head: true });
    if (error) {
      return {
        success: false,
        message: `Falha na conexão: ${error.message}`
      };
    }
    return {
      success: true,
      message: 'Conectado com sucesso ao banco de dados Supabase!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao testar conexão: ${err.message || String(err)}`
    };
  }
}
