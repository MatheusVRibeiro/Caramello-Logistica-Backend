import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;
const cacheEnabled = Boolean(redisUrl);

let client: ReturnType<typeof createClient> | null = null;
let isReady = false;

const getClient = () => {
  if (!cacheEnabled) {
    return null;
  }

  if (!client) {
    client = createClient({ url: redisUrl });
    client.on('error', (err: unknown) => {
      console.error('❌ [REDIS] Erro na conexao:', err);
    });
    client.on('ready', () => {
      isReady = true;
      console.log('✅ [REDIS] Conexao estabelecida');
    });
    client.connect().catch((err: unknown) => {
      console.error('❌ [REDIS] Falha ao conectar:', err);
    });
  }

  return client;
};

export const isCacheReady = (): boolean => cacheEnabled && isReady;

export const getCache = async <T>(key: string): Promise<T | null> => {
  const redis = getClient();
  if (!redis || !isReady) return null;

  const value = await redis.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const setCache = async (key: string, value: unknown, ttlSeconds = 60): Promise<void> => {
  const redis = getClient();
  if (!redis || !isReady) return;

  const payload = JSON.stringify(value);
  await redis.set(key, payload, { EX: ttlSeconds });
};
