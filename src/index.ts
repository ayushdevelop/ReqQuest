#!/usr/bin/env node

import { Command } from "commander";

import { runQuest } from "./commands/quest.js";

const program = new Command();

program
    .name("reqquest")
    .description("AI-powered API companion")
    .argument("<prompt>")
    .action(async (prompt) => {
        await runQuest(prompt);
    });

program.parse();