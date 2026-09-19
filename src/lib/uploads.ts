import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";

// Single uploads location shared by generate-image, ai-video, and /api/upload.
export const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

// Only files the app itself generated are ever pruned (prefix allowlist).
// Anything else in the directory (user-placed assets, .gitkeep) is untouched.
const GENERATED_PREFIXES = ["ai-", "thumb-", "concept-", "upload-"];

// Bound the work per run so a large directory can't stall the cron tick.
const MAX_FILES_PER_RUN = 500;

export interface PruneResult {
  scanned: number;
  candidates: number;
  deleted: number;
  keptReferenced: number;
  freedBytes: number;
}

/**
 * Delete generated files older than `maxAgeDays` that are not referenced by
 * any Post.mediaUrl or MediaProject.thumbnail. Returns a full accounting.
 * Never throws on individual file races (concurrent deletion is skipped).
 */
export async function pruneUploads(maxAgeDays: number): Promise<PruneResult> {
  const empty: PruneResult = {
    scanned: 0,
    candidates: 0,
    deleted: 0,
    keptReferenced: 0,
    freedBytes: 0,
  };

  let entries: string[];
  try {
    entries = await readdir(UPLOAD_DIR);
  } catch {
    return empty; // Directory missing — nothing to do.
  }

  const cutoff = Date.now() - maxAgeDays * 86_400_000;
  const generated: Array<{ name: string; mtime: number; size: number }> = [];
  for (const name of entries) {
    if (!GENERATED_PREFIXES.some((p) => name.startsWith(p))) continue;
    try {
      const st = await stat(join(UPLOAD_DIR, name));
      if (st.isFile()) {
        generated.push({ name, mtime: st.mtimeMs, size: st.size });
      }
    } catch {
      // Raced deletion — skip.
    }
  }

  // Oldest first, bounded.
  generated.sort((a, b) => a.mtime - b.mtime);
  const candidates = generated
    .filter((f) => f.mtime < cutoff)
    .slice(0, MAX_FILES_PER_RUN);
  if (candidates.length === 0) {
    return { ...empty, scanned: generated.length };
  }

  // Exact-match reference check in a single round-trip per table.
  const urls = candidates.map((f) => `/uploads/${f.name}`);
  const [posts, projects] = await Promise.all([
    db.post.findMany({
      where: { mediaUrl: { in: urls } },
      select: { mediaUrl: true },
    }),
    db.mediaProject.findMany({
      where: { thumbnail: { in: urls } },
      select: { thumbnail: true },
    }),
  ]);
  const referenced = new Set<string>();
  for (const p of posts) {
    if (p.mediaUrl) referenced.add(p.mediaUrl);
  }
  for (const p of projects) {
    if (p.thumbnail) referenced.add(p.thumbnail);
  }

  let deleted = 0;
  let keptReferenced = 0;
  let freedBytes = 0;
  for (const f of candidates) {
    if (referenced.has(`/uploads/${f.name}`)) {
      keptReferenced += 1;
      continue;
    }
    try {
      await unlink(join(UPLOAD_DIR, f.name));
      deleted += 1;
      freedBytes += f.size;
    } catch {
      // Raced deletion — skip.
    }
  }

  return {
    scanned: generated.length,
    candidates: candidates.length,
    deleted,
    keptReferenced,
    freedBytes,
  };
}
