import { rm } from "node:fs/promises";
import { join } from "node:path";

await rm(join(process.cwd(), ".next"), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined);
