#!/usr/bin/env node

import { Command } from "commander";

import { runQuest } from "./commands/quest.js";

const program = new Command();

program
    .name("reqquest")
    .description("AI-powered API companion")
    .option("-c, --companion <type>", "companion personality: wizard, rogue, samurai, robot", "wizard")
    .argument("<prompt>")
    .action(async (prompt, options) => {
        await runQuest(prompt, options.companion);
    });

program.parse();