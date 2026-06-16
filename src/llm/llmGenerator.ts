import axios from "axios";
import chalk from "chalk";
import { type RequestConfig, RequestSchema } from "../schemas/requestSchema.js";
import { generateMockRequest } from "../utils/mockGenerator.js";

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

/**
 * Generates an API RequestConfig from a natural language prompt.
 * First checks for GEMINI_API_KEY or OPENAI_API_KEY in the environment.
 * If keys are present, queries the respective LLM and validates the output using Zod.
 * If keys are absent or API queries fail, falls back to the local MockGenerator.
 */
export async function generateRequest(prompt: string): Promise<RequestConfig> {
    const groqKey = process.env["GROQ_API_KEY"];
    const geminiKey = process.env["GEMINI_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];

    if (!groqKey && !geminiKey && !openaiKey) {
        console.warn(
            chalk.yellow(
                "⚠️  No GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY found in environment variables. Falling back to offline Mock Generator."
            )
        );
        return generateMockRequest(prompt);
    }

    let rawJson = "";

    try {
        if (groqKey) {
            // Use Groq API (OpenAI compatible endpoint)
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: SYSTEM_INSTRUCTION
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
                        Authorization: `Bearer ${groqKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error("Empty response from Groq API");
            }
            rawJson = content;
        } else if (geminiKey) {
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
                                text: SYSTEM_INSTRUCTION
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
                            content: SYSTEM_INSTRUCTION
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
