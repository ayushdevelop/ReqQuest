import chalk from "chalk";
import { clearHistory, loadHistory, type HistoryEntry } from "../history/store.js";
import { askConfirmation } from "../utils/confirmation.js";

function formatMethod(method: string): string {
    const colors: Record<string, (s: string) => string> = {
        GET: chalk.green,
        POST: chalk.yellow,
        PUT: chalk.blue,
        PATCH: chalk.magenta,
        DELETE: chalk.red,
    };
    const colorFn = colors[method] ?? chalk.white;
    return colorFn(method.padEnd(6));
}

function formatStatus(entry: HistoryEntry): string {
    if (entry.status === "cancelled") {
        return chalk.gray("cancelled");
    }
    const code = entry.responseStatus;
    if (!code) return chalk.gray("unknown");
    if (code >= 200 && code < 300) return chalk.green(String(code));
    if (code >= 300 && code < 400) return chalk.cyan(String(code));
    if (code >= 400 && code < 500) return chalk.yellow(String(code));
    return chalk.red(String(code));
}

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export async function runHistoryList(options: { limit?: string }) {
    const entries = loadHistory();

    if (entries.length === 0) {
        console.log(chalk.gray("\n  No history yet. Run a quest first!\n"));
        return;
    }

    const limit = options.limit ? parseInt(options.limit, 10) : 20;
    const shown = entries.slice(0, limit);

    console.log();
    console.log(
        chalk.bold(
            `  ${"ID".padEnd(12)} ${"TIME".padEnd(14)} ${"METHOD".padEnd(8)} ${"STATUS".padEnd(10)} PROMPT`
        )
    );
    console.log(chalk.gray("  " + "─".repeat(72)));

    for (const entry of shown) {
        const id = chalk.cyan(entry.id.padEnd(12));
        const time = chalk.gray(formatTimestamp(entry.timestamp).padEnd(14));
        const method = formatMethod(entry.request.method);
        const status = formatStatus(entry).padEnd(10);
        const prompt = chalk.white(truncate(entry.prompt, 36));
        console.log(`  ${id} ${time} ${method} ${status} ${prompt}`);
    }

    if (entries.length > limit) {
        console.log(chalk.gray(`\n  … and ${entries.length - limit} more. Use --limit to see more.`));
    }

    console.log();
}

export async function runHistoryClear() {
    const entries = loadHistory();

    if (entries.length === 0) {
        console.log(chalk.gray("\n  History is already empty.\n"));
        return;
    }

    const confirmed = await askConfirmation(
        chalk.yellow(`\n  ⚠️  Clear all ${entries.length} history entries? (y/N): `)
    );

    if (!confirmed) {
        console.log(chalk.blue("  Aborted. History untouched.\n"));
        return;
    }

    clearHistory();
    console.log(chalk.green("  ✓ History cleared.\n"));
}