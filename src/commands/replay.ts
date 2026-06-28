import chalk from "chalk";
import ora from "ora";
import { findEntryById } from "../history/store.js";
import { executeRequest } from "../http/executeRequest.js";
import { displayRequest } from "../utils/requestDisplay.js";
import { askConfirmation } from "../utils/confirmation.js";
import { companions, defaultCompanion } from "../companion/index.js";
import { appendEntry, generateId } from "../history/store.js";

export async function runReplay(id: string, options: { companion?: string }) {
    const entry = findEntryById(id);

    if (!entry) {
        console.error(chalk.red(`\n  ✗ No history entry found matching ID: "${id}"\n`));
        console.log(chalk.gray('  Run `reqquest history` to see available IDs.\n'));
        process.exit(1);
    }

    const companion = options.companion
        ? (companions[options.companion.toLowerCase()] ?? defaultCompanion)
        : (entry.companion ? (companions[entry.companion] ?? defaultCompanion) : defaultCompanion);

    console.log();
    console.log(chalk.gray(`  Replaying entry ${chalk.cyan(entry.id)} from ${new Date(entry.timestamp).toLocaleString()}`));
    console.log(chalk.gray(`  Original prompt: "${entry.prompt}"`));

    displayRequest(entry.request);

    const confirmed = await askConfirmation(
        chalk.yellow(`⚔️  ${companion.name} asks: Re-execute this request? (y/N): `)
    );

    if (!confirmed) {
        // Ask whether to save this cancelled replay
        const saveIt = await askConfirmation(
            chalk.gray("  Save this cancelled replay to history? (y/N): ")
        );
        if (saveIt) {
            appendEntry({
                id: generateId(),
                timestamp: new Date().toISOString(),
                prompt: `[replay] ${entry.prompt}`,
                request: entry.request,
                status: "cancelled",
                companion: companion.name.toLowerCase(),
            });
            console.log(chalk.gray("  Saved to history.\n"));
        }

        const msgs = companion.cancelMessages;
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        console.log(chalk.blue(`❄️  ${companion.name}: ${msg}`));
        return;
    }

    const frames = companion.spinnerFrames;
    const loadMsgs = companion.loadingMessages;
    const spinner = ora({
        text: `${companion.name}: ${loadMsgs[Math.floor(Math.random() * loadMsgs.length)]}`,
        spinner: {
            interval: companion.spinnerInterval,
            frames,
        }
    }).start();

    try {
        const response = await executeRequest(entry.request);

        spinner.succeed(
            `${companion.name}: ${companion.successMessages[Math.floor(Math.random() * companion.successMessages.length)]} ${response.status}`
        );

        appendEntry({
            id: generateId(),
            timestamp: new Date().toISOString(),
            prompt: `[replay] ${entry.prompt}`,
            request: entry.request,
            status: "executed",
            responseStatus: response.status,
            companion: companion.name.toLowerCase(),
        });

        console.log(chalk.green(JSON.stringify(response.data, null, 2)));
    } catch (error: any) {
        const status = error.response?.status;

        spinner.fail(
            `${companion.name}: ${companion.errorMessages[Math.floor(Math.random() * companion.errorMessages.length)]}`
        );

        appendEntry({
            id: generateId(),
            timestamp: new Date().toISOString(),
            prompt: `[replay] ${entry.prompt}`,
            request: entry.request,
            status: "executed",
            responseStatus: status,
            companion: companion.name.toLowerCase(),
        });

        console.error(error);
    }
}