import readline from "readline";

/**
 * Prompts the user with a query in the terminal and returns a boolean promise
 * indicating whether the user typed 'y' or 'yes'.
 */
export function askConfirmation(query: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === "y" || normalized === "yes");
        });
    });
}
