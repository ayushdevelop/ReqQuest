import chalk from "chalk";
import ora from "ora";

import { wizard } from "../companion/index.js";
import { executeRequest } from "../http/executeRequest.js";

export async function runQuest(prompt: string) {
    const spinner = ora(
        `${wizard.name}: ${wizard.loadingMessages[0]}`
    ).start();

    try {
        const response = await executeRequest();

        spinner.succeed(
            `${wizard.successMessages[0]} ${response.status}`
        );

        console.log(
            chalk.green(
                JSON.stringify(response.data, null, 2)
            )
        );
    } catch (error) {
        spinner.fail(wizard.errorMessages[0]);

        console.error(error);
    }
}