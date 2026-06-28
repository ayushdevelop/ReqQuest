#!/usr/bin/env node

import { Command } from "commander";

import { runQuest } from "./commands/quest.js";
import { runHistoryList, runHistoryClear } from "./commands/history.js";
import { runReplay } from "./commands/replay.js";

const program = new Command();

program
    .name("reqquest")
    .description("AI-powered API companion")
    .version("1.1.0");

// Main quest command: reqquest "get users from jsonplaceholder"
program
    .command("quest <prompt>", { isDefault: true })
    .description("Turn a natural language prompt into an API request")
    .option("-c, --companion <type>", "companion personality: wizard, rogue, samurai, robot", "wizard")
    .action(async (prompt, options) => {
        await runQuest(prompt, options.companion);
    });

// History command: reqquest history [--limit 50]
const historyCmd = program
    .command("history")
    .description("View and manage request history");

historyCmd
    .command("list", { isDefault: true })
    .description("List past requests")
    .option("-l, --limit <n>", "number of entries to show", "20")
    .action(async (options) => {
        await runHistoryList(options);
    });

historyCmd
    .command("clear")
    .description("Clear all history")
    .action(async () => {
        await runHistoryClear();
    });

// Replay command: reqquest replay <id>
program
    .command("replay <id>")
    .description("Re-execute a request from history by ID (prefix match supported)")
    .option("-c, --companion <type>", "override companion personality")
    .action(async (id, options) => {
        await runReplay(id, options);
    });

program.parse();