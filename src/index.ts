#!/usr/bin/env node

import { Command } from "commander";
import { loadUserEnv } from "./utils/loadEnv.js";
import { runQuest } from "./commands/quest.js";
import { runHistoryList, runHistoryClear } from "./commands/history.js";
import { runReplay } from "./commands/replay.js";

// Load ~/.reqquest/.env before anything else
loadUserEnv();

const program = new Command();

program
    .name("reqquest")
    .description("AI-powered terminal companion that turns natural language into API requests")
    .version("1.1.0");

// Main quest command — default: reqquest "get all users"
program
    .command("quest <prompt>", { isDefault: true })
    .description("Turn a natural language prompt into an API request")
    .option("-c, --companion <type>", "companion personality: wizard, rogue, samurai, robot", "wizard")
    .action(async (prompt: string, options: { companion?: string }) => {
        await runQuest(prompt, options.companion);
    });

// History — reqquest history OR reqquest history list
const historyCmd = program
    .command("history")
    .description("View and manage request history")
    .option("-l, --limit <n>", "number of entries to show", "20")
    .action(async (options: { limit?: string }) => {
        // reqquest history (no subcommand) → show list
        await runHistoryList(options);
    });

historyCmd
    .command("list")
    .description("List past requests")
    .option("-l, --limit <n>", "number of entries to show", "20")
    .action(async (options: { limit?: string }) => {
        await runHistoryList(options);
    });

historyCmd
    .command("clear")
    .description("Clear all history")
    .action(async () => {
        await runHistoryClear();
    });

// Replay — reqquest replay <id>
program
    .command("replay <id>")
    .description("Re-execute a request from history by ID (prefix match supported)")
    .option("-c, --companion <type>", "override companion personality")
    .action(async (id: string, options: { companion?: string }) => {
        await runReplay(id, options);
    });

program.parse();