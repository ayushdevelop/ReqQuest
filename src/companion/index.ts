import { wizard } from "./wizard.js";
import { rogue } from "./rogue.js";
import { samurai } from "./samurai.js";
import { robot } from "./robot.js";

export { wizard, rogue, samurai, robot };

export interface Companion {
    name: string;
    loadingMessages: string[];
    successMessages: string[];
    errorMessages: string[];
    cancelMessages: string[];
}

export const companions: Record<string, Companion> = {
    wizard,
    rogue,
    samurai,
    robot
};

export const defaultCompanion = wizard;