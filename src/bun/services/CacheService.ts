import { join } from "path";
import { homedir } from "os";
import { mkdir, unlink, rm } from "fs/promises";

const CACHE_DIR = join(homedir(), ".ddbflow", "cache");

function keyToPath(key: string): string {
  const parts = key.split(":");
  const filename = parts[parts.length - 1] + ".json";
  const dirs = parts.slice(0, -1);
  return join(CACHE_DIR, ...dirs, filename);
}

export async function readCache(key: string): Promise<string | null> {
  try {
    const file = Bun.file(keyToPath(key));
    if (!(await file.exists())) return null;
    return await file.text();
  } catch { return null; }
}

export async function writeCache(key: string, value: string): Promise<void> {
  const path = keyToPath(key);
  await mkdir(join(path, ".."), { recursive: true });
  await Bun.write(path, value);
}

export async function deleteCache(key: string): Promise<void> {
  try { await unlink(keyToPath(key)); } catch { /* ignore */ }
}

export async function purgeCache(): Promise<void> {
  try { await rm(CACHE_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
}
