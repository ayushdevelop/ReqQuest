import chalk from "chalk";
import { type RequestConfig }
    from "../schemas/requestSchema.js";

export function displayRequest(
    request: RequestConfig
) {
    console.log();

    console.log(
        chalk.cyan(
            `${request.method} ${request.url}`
        )
    );

    if (request.query) {
        console.log();
        console.log("Query:");
        console.log(request.query);
    }

    if (request.headers) {
        console.log();
        console.log("Headers:");
        console.log(request.headers);
    }

    if (request.body) {
        console.log();
        console.log("Body:");
        console.log(
            JSON.stringify(
                request.body,
                null,
                2
            )
        );
    }

    console.log();
}