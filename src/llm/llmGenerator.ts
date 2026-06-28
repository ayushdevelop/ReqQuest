import axios from "axios";
import chalk from "chalk";
import { type RequestConfig, RequestSchema } from "../schemas/requestSchema.js";

const SYSTEM_INSTRUCTION = `You are an API client generator companion. You convert natural language descriptions of API operations into a structured JSON configuration representing an HTTP request.

Your output MUST adhere strictly to this JSON Schema:
{
  "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  "url": "string (must be an absolute URL starting with http:// or https://)",
  "headers": "object (Record<string, string>, optional)",
  "query": "object (Record<string, string>, optional, representing URL query parameters)",
  "body": "any (optional, representing the request payload)"
}

Rules:
1. If the prompt specifies query parameters (e.g. "with token=abc" or "query param limit=10"), map them to the 'query' object.
2. If the prompt specifies a request body payload (e.g. "body hello", "message hello", or "JSON data {foo: bar}"), map them to the 'body' field.
3. If the prompt has headers (e.g. "header authorization bearer xyz"), map them to the 'headers' object.
4. Output raw JSON only. Do not include markdown code block formatting (such as \`\`\`json).`;

export function checkApiKeys(): void {
    const hasKey =
        process.env["GROQ_API_KEY"] ||
        process.env["GEMINI_API_KEY"] ||
        process.env["OPENAI_API_KEY"];

    if (!hasKey) {
        console.error(chalk.red("\n  ✗ No API key found.\n"));
        console.error(
            chalk.white("  ReqQuest needs one of the following to generate requests:\n")
        );
        console.error(
            [
                chalk.cyan("  GROQ_API_KEY  ") + chalk.gray(" → https://console.groq.com        (free, fast — recommended)"),
                chalk.cyan("  GEMINI_API_KEY") + chalk.gray(" → https://aistudio.google.com     (free tier)"),
                chalk.cyan("  OPENAI_API_KEY") + chalk.gray(" → https://platform.openai.com     (paid)"),
            ].join("\n")
        );
        console.error(chalk.white("\n  Option 1 — set it in your shell:"));
        console.error(chalk.gray("    export GROQ_API_KEY=your_key_here\n"));
        console.error(chalk.white("  Option 2 — create a config file (no shell edits needed):"));
        console.error(chalk.gray("    mkdir -p ~/.reqquest"));
        console.error(chalk.gray("    echo 'GROQ_API_KEY=your_key_here' >> ~/.reqquest/.env\n"));
        process.exit(1);
    }
}

export async function generateRequest(prompt: string): Promise<RequestConfig> {
    const groqKey = process.env["GROQ_API_KEY"];
    const geminiKey = process.env["GEMINI_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];

    let rawJson = "";

    try {
        if (groqKey) {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: SYSTEM_INSTRUCTION },
                        { role: "user", content: `Translate this prompt into a RequestConfig JSON: "${prompt}"` }
                    ],
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        Authorization: `Bearer ${groqKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) throw new Error("Empty response from Groq API");
            rawJson = content;

        } else if (geminiKey) {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                {
                    contents: [{
                        parts: [{
                            text: `Translate this prompt into an API RequestConfig JSON object. Do not include markdown code block formatting, return raw JSON only. Prompt: "${prompt}"`
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                method: { type: "STRING", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
                                url: { type: "STRING" },
                                headers: { type: "OBJECT", additionalProperties: { type: "STRING" } },
                                query: { type: "OBJECT", additionalProperties: { type: "STRING" } },
                                body: { type: "STRING" }
                            },
                            required: ["method", "url"]
                        }
                    },
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
                },
                { headers: { "Content-Type": "application/json" } }
            );

            const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) throw new Error("Empty response from Gemini API");
            rawJson = textResponse;

        } else if (openaiKey) {
            const response = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: SYSTEM_INSTRUCTION },
                        { role: "user", content: `Translate this prompt into a RequestConfig JSON: "${prompt}"` }
                    ],
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        Authorization: `Bearer ${openaiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) throw new Error("Empty response from OpenAI API");
            rawJson = content;
        }

        // Parse LLM output
        const parsed = JSON.parse(rawJson);

        // Parse body if returned as stringified JSON
        if (parsed.body && typeof parsed.body === "string") {
            const trimmed = parsed.body.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                try { parsed.body = JSON.parse(trimmed); } catch { /* leave as string */ }
            }
        }

        // Validate with Zod
        const validated = RequestSchema.safeParse(parsed);
        if (!validated.success) {
            const issues = validated.error.issues
                .map(e => `  - ${e.path.join(".")}: ${e.message}`)
                .join("\n");
            console.error(chalk.red(`\n  ✗ LLM returned an invalid request structure:\n${issues}\n`));
            process.exit(1);
        }

        return validated.data;

    } catch (error: any) {
        // Surface API errors clearly without stack traces
        const apiMsg = error.response?.data?.error?.message;
        const status = error.response?.status;

        if (apiMsg || status) {
            console.error(chalk.red(`\n  ✗ API error${status ? ` (${status})` : ""}: ${apiMsg ?? error.message}\n`));
        } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
            console.error(chalk.red("\n  ✗ Network error: could not reach the API. Check your connection.\n"));
        } else {
            console.error(chalk.red(`\n  ✗ ${error.message}\n`));
        }

        process.exit(1);
    }
}
