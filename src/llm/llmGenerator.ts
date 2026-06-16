import axios from "axios";
import chalk from "chalk";
import { type RequestConfig, RequestSchema } from "../schemas/requestSchema.js";
import { generateMockRequest } from "../utils/mockGenerator.js";

/**
 * Generates an API RequestConfig from a natural language prompt.
 * First checks for GEMINI_API_KEY or OPENAI_API_KEY in the environment.
 * If keys are present, queries the respective LLM and validates the output using Zod.
 * If keys are absent or API queries fail, falls back to the local MockGenerator.
 */
export async function generateRequest(prompt: string): Promise<RequestConfig> {
    const geminiKey = process.env["GEMINI_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];

    if (!geminiKey && !openaiKey) {
        console.warn(
            chalk.yellow(
                "⚠️  No GEMINI_API_KEY or OPENAI_API_KEY found in environment variables. Falling back to offline Mock Generator."
            )
        );
        return generateMockRequest(prompt);
    }

    let rawJson = "";

    try {
        if (geminiKey) {
            // Use Gemini API
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                {
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Translate this prompt into an API RequestConfig JSON object. Do not include markdown code block formatting, return raw JSON only. Prompt: "${prompt}"`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                method: {
                                    type: "STRING",
                                    enum: ["GET", "POST", "PUT", "PATCH", "DELETE"]
                                },
                                url: {
                                    type: "STRING"
                                },
                                headers: {
                                    type: "OBJECT",
                                    additionalProperties: {
                                        type: "STRING"
                                    }
                                },
                                query: {
                                    type: "OBJECT",
                                    additionalProperties: {
                                        type: "STRING"
                                    }
                                },
                                body: {
                                    type: "STRING"
                                }
                            },
                            required: ["method", "url"]
                        }
                    },
                    systemInstruction: {
                        parts: [
                            {
                                text: "You are an API client generator companion. You convert natural language descriptions of API operations into a structured JSON configuration representing an HTTP request."
                            }
                        ]
                    }
                },
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) {
                throw new Error("Empty response from Gemini API");
            }
            rawJson = textResponse;
        } else if (openaiKey) {
            // Use OpenAI API
            const response = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "You are an API client generator companion. You convert natural language descriptions of API operations into a structured JSON configuration representing an HTTP request."
                        },
                        {
                            role: "user",
                            content: `Translate this prompt into a RequestConfig JSON: "${prompt}"`
                        }
                    ],
                    response_format: {
                        type: "json_object"
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${openaiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error("Empty response from OpenAI API");
            }
            rawJson = content;
        }

        // Parse LLM output
        const parsed = JSON.parse(rawJson);

        // Parse body if it is returned as a stringified JSON object
        if (parsed.body && typeof parsed.body === "string") {
            const trimmedBody = parsed.body.trim();
            if (trimmedBody.startsWith("{") || trimmedBody.startsWith("[")) {
                try {
                    parsed.body = JSON.parse(trimmedBody);
                } catch {
                    // Fail-safe: leave as string if it isn't valid JSON
                }
            }
        }

        // Validate using Zod Schema
        const validated = RequestSchema.safeParse(parsed);
        if (!validated.success) {
            console.warn(
                chalk.yellow(
                    "⚠️  LLM response validation failed. Falling back to offline Mock Generator. Errors:\n" +
                    validated.error.issues.map(e => ` - ${e.path.join(".")}: ${e.message}`).join("\n")
                )
            );
            return generateMockRequest(prompt);
        }

        return validated.data;

    } catch (error: any) {
        const errMsg = error.response?.data?.error?.message || error.message || error;
        console.warn(
            chalk.yellow(
                `⚠️  LLM Generator failed (${errMsg}). Falling back to Mock Generator.`
            )
        );
        return generateMockRequest(prompt);
    }
}
