import chalk from "chalk";
import ora from "ora";

import { companions, defaultCompanion } from "../companion/index.js";
import { executeRequest } from "../http/executeRequest.js";
import { generateRequest } from "../llm/llmGenerator.js";
import { displayRequest } from "../utils/requestDisplay.js";
import { askConfirmation } from "../utils/confirmation.js";

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

        console.log(
            chalk.green(
                JSON.stringify(response.data, null, 2)
            )
        );
    } catch (error) {
        spinner.fail(`${companion.name}: ${randomMessage(companion.errorMessages)}`);

        console.error(error);
    }
}