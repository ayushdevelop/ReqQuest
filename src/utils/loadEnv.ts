import path from "path";
import os from "os";
import fs from "fs";
import { config } from "dotenv";

/**
 * Loads ~/.reqquest/.env if it exists, before any API key checks run.
 * This lets users set keys once without touching their shell profile.
 */
export function loadUserEnv(): void {
    const envPath = path.join(os.homedir(), ".reqquest", ".env");
    if (fs.existsSync(envPath)) {
        config({ path: envPath });
    }
}
