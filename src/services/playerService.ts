import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/logger";
import { FileManagerError, jsonError, resolveRoot } from "./fileManagerService";

/**
 * Player management based on the vanilla server files:
 * usercache.json (everyone who has joined), ops.json and whitelist.json.
 * The server only reads ops/whitelist at startup, so changes take effect
 * after a restart.
 */

interface UserCacheEntry {
  name: string;
  uuid: string;
  expiresOn?: string;
}

interface OpEntry {
  uuid: string;
  name: string;
  level: number;
  bypassesPlayerLimit: boolean;
}

interface WhitelistEntry {
  uuid: string;
  name: string;
}

export interface KnownPlayer {
  name: string;
  uuid: string;
  lastSeen: string | null;
  isOp: boolean;
  opLevel: number | null;
  isWhitelisted: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read a JSON array file; a missing file is empty, an unparsable one is
 * reported so the UI can tell the user it will be repaired on the next change.
 */
async function readJsonArray<T>(filePath: string): Promise<{ entries: T[]; invalid: boolean }> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return { entries: [], invalid: false };
  }

  if (!content.trim()) return { entries: [], invalid: false };

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? { entries: parsed as T[], invalid: false } : { entries: [], invalid: true };
  } catch {
    return { entries: [], invalid: true };
  }
}

async function writeJsonArray(filePath: string, entries: unknown[]): Promise<void> {
  await Bun.write(filePath, JSON.stringify(entries, null, 2) + "\n");
}

function sameUuid(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * The cache stores expiry = last seen + 1 month
 */
function lastSeenFromExpiry(expiresOn?: string): string | null {
  if (!expiresOn) return null;
  const date = new Date(expiresOn.replace(/ ([+-]\d{4})$/, "$1").replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString();
}

/**
 * GET /api/players?project=
 */
export async function listPlayers(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const root = await resolveRoot(url.searchParams.get("project"));

    const [cache, ops, whitelist] = await Promise.all([
      readJsonArray<UserCacheEntry>(path.join(root, "usercache.json")),
      readJsonArray<OpEntry>(path.join(root, "ops.json")),
      readJsonArray<WhitelistEntry>(path.join(root, "whitelist.json")),
    ]);

    const players = new Map<string, KnownPlayer>();
    const ensure = (uuid: string, name: string): KnownPlayer => {
      const key = uuid.toLowerCase();
      let player = players.get(key);
      if (!player) {
        player = { name, uuid, lastSeen: null, isOp: false, opLevel: null, isWhitelisted: false };
        players.set(key, player);
      }
      return player;
    };

    for (const entry of cache.entries) {
      if (!entry?.uuid || !entry?.name) continue;
      ensure(entry.uuid, entry.name).lastSeen = lastSeenFromExpiry(entry.expiresOn);
    }
    for (const entry of ops.entries) {
      if (!entry?.uuid || !entry?.name) continue;
      const player = ensure(entry.uuid, entry.name);
      player.isOp = true;
      player.opLevel = entry.level ?? 4;
    }
    for (const entry of whitelist.entries) {
      if (!entry?.uuid || !entry?.name) continue;
      ensure(entry.uuid, entry.name).isWhitelisted = true;
    }

    const sorted = [...players.values()].sort((a, b) =>
      (b.lastSeen || "").localeCompare(a.lastSeen || "") || a.name.localeCompare(b.name)
    );

    const invalidFiles = [
      ops.invalid ? "ops.json" : null,
      whitelist.invalid ? "whitelist.json" : null,
    ].filter(Boolean);

    return Response.json({ success: true, players: sorted, invalidFiles });
  } catch (error) {
    return jsonError(error, "Failed to list players");
  }
}

function parsePlayerBody(body: { uuid?: string; name?: string }): { uuid: string; name: string } {
  const uuid = (body.uuid || "").trim();
  const name = (body.name || "").trim();

  if (!UUID_PATTERN.test(uuid) || !/^[A-Za-z0-9_]{1,16}$/.test(name)) {
    throw new FileManagerError("Invalid player", 400);
  }
  return { uuid, name };
}

/**
 * POST /api/players/op { project, uuid, name, op, level? }
 */
export async function setPlayerOp(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      project?: string;
      uuid?: string;
      name?: string;
      op?: boolean;
      level?: number;
    };
    const root = await resolveRoot(body.project);
    const { uuid, name } = parsePlayerBody(body);
    const level = Math.min(4, Math.max(1, Math.round(body.level ?? 4)));

    const filePath = path.join(root, "ops.json");
    const { entries } = await readJsonArray<OpEntry>(filePath);
    const remaining = entries.filter((entry) => !entry?.uuid || !sameUuid(entry.uuid, uuid));

    if (body.op) {
      remaining.push({ uuid, name, level, bypassesPlayerLimit: false });
    }

    await writeJsonArray(filePath, remaining);
    logger.info(`ops.json updated: ${name} ${body.op ? `op level ${level}` : "deopped"}`);

    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to update ops.json");
  }
}

/**
 * POST /api/players/whitelist { project, uuid, name, whitelisted }
 */
export async function setPlayerWhitelisted(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      project?: string;
      uuid?: string;
      name?: string;
      whitelisted?: boolean;
    };
    const root = await resolveRoot(body.project);
    const { uuid, name } = parsePlayerBody(body);

    const filePath = path.join(root, "whitelist.json");
    const { entries } = await readJsonArray<WhitelistEntry>(filePath);
    const remaining = entries.filter((entry) => !entry?.uuid || !sameUuid(entry.uuid, uuid));

    if (body.whitelisted) {
      remaining.push({ uuid, name });
    }

    await writeJsonArray(filePath, remaining);
    logger.info(`whitelist.json updated: ${name} ${body.whitelisted ? "added" : "removed"}`);

    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to update whitelist.json");
  }
}
