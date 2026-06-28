import chalk from "chalk";
import ora from "ora";

import { companions, defaultCompanion } from "../companion/index.js";
import { executeRequest } from "../http/executeRequest.js";
import { generateRequest } from "../llm/llmGenerator.js";
import { displayRequest } from "../utils/requestDisplay.js";
import { askConfirmation } from "../utils/confirmation.js";
import { appendEntry, generateId } from "../history/store.js";

// Helper to select a random message from a companion's list
function randomMessage(messages: string[]): string {
    if (!messages.length) return "";
    const index = Math.floor(Math.random() * messages.length);
    return messages[index] || "";
}

export async function runQuest(prompt: string, companionType?: string) {
    const companion = companionType
        ? (companions[companionType.toLowerCase()] || defaultCompanion)
        : defaultCompanion;

    // Generate request config from prompt (uses LLM or falls back to mock)
    const requestConfig = await generateRequest(prompt);

    // Display the generated request detail
    displayRequest(requestConfig);

    // Prompt the user for confirmation before executing the HTTP request
    const confirmed = await askConfirmation(
        chalk.yellow(`⚔️  ${companion.name} asks: Execute this request? (y/N): `)
    );

    if (!confirmed) {
        // Ask whether to save this cancelled request to history
        const saveIt = await askConfirmation(
            chalk.gray("  Save this cancelled request to history? (y/N): ")
        );

        if (saveIt) {
            appendEntry({
                id: generateId(),
                timestamp: new Date().toISOString(),
                prompt,
                request: requestConfig,
                status: "cancelled",
                companion: companion.name.toLowerCase(),
            });
            console.log(chalk.gray("  Saved to history.\n"));
        }

        console.log(
            chalk.blue(`❄️  ${companion.name}: ${randomMessage(companion.cancelMessages)}`)
        );
        return;
    }

    const spinner = ora({
        text: `${companion.name}: ${randomMessage(companion.loadingMessages)}`,
        spinner: {
            interval: companion.spinnerInterval,
            frames: companion.spinnerFrames
        }
    }).start();

    try {
        const response = await executeRequest(requestConfig);

        spinner.succeed(
            `${companion.name}: ${randomMessage(companion.successMessages)} ${response.status}`
        );

        // Save executed request to history
        appendEntry({
            id: generateId(),
            timestamp: new Date().toISOString(),
            prompt,
            request: requestConfig,
            status: "executed",
            responseStatus: response.status,
            companion: companion.name.toLowerCase(),
        });

        console.log(
            chalk.green(
                JSON.stringify(response.data, null, 2)
            )
        );
    } catch (error: any) {
        const status = error.response?.status;

        spinner.fail(`${companion.name}: ${randomMessage(companion.errorMessages)}`);

        // Save failed request to history too — useful for debugging
        appendEntry({
            id: generateId(),
            timestamp: new Date().toISOString(),
            prompt,
            request: requestConfig,
            status: "executed",
            responseStatus: status,
            companion: companion.name.toLowerCase(),
        });

        console.error(error);
    }
}