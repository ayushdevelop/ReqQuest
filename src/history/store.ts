import fs from "fs";
import os from "os";
import path from "path";
import { type RequestConfig } from "../schemas/requestSchema.js";

export type RequestStatus = "executed" | "cancelled";

export interface HistoryEntry {
    id: string;
    timestamp: string;
    prompt: string;
    request: RequestConfig;
    status: RequestStatus;
    responseStatus?: number;
    companion?: string;
}

const HISTORY_DIR = path.join(os.homedir(), ".reqquest");
const HISTORY_FILE = path.join(HISTORY_DIR, "history.json");
const MAX_HISTORY = 100;

function ensureHistoryDir(): void {
    if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
}

export function loadHistory(): HistoryEntry[] {
    ensureHistoryDir();
    if (!fs.existsSync(HISTORY_FILE)) {
        return [];
    }
    try {
        const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
        return JSON.parse(raw) as HistoryEntry[];
    } catch {
        return [];
    }
}

export function saveHistory(entries: HistoryEntry[]): void {
    ensureHistoryDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export function appendEntry(entry: HistoryEntry): void {
    const entries = loadHistory();
    entries.unshift(entry); // newest first
    const trimmed = entries.slice(0, MAX_HISTORY);
    saveHistory(trimmed);
}

export function clearHistory(): void {
    ensureHistoryDir();
    saveHistory([]);
}

export function generateId(): string {
    // Short, human-readable ID: timestamp base36 + 3 random chars
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 5);
    return `${ts}${rand}`;
}

export function findEntryById(id: string): HistoryEntry | undefined {
    const entries = loadHistory();
    // Support prefix matching so users can type short IDs
    return entries.find(e => e.id === id || e.id.startsWith(id));
}