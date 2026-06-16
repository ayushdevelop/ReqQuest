import { type RequestConfig } from "../schemas/requestSchema.js";

/**
 * A local mock generator that parses natural language prompts
 * and outputs a mock RequestConfig structure for Phase 1.
 */
export function generateMockRequest(prompt: string): RequestConfig {
    const trimmed = prompt.trim();

    // Default config
    let method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET";
    let url = "https://jsonplaceholder.typicode.com/posts/1";
    let headers: Record<string, string> | undefined = undefined;
    let query: Record<string, string> | undefined = undefined;
    let body: unknown = undefined;

    const lowerPrompt = trimmed.toLowerCase();

    // Detect HTTP method
    if (/\bpost\b/i.test(trimmed)) {
        method = "POST";
    } else if (/\bput\b/i.test(trimmed)) {
        method = "PUT";
    } else if (/\bpatch\b/i.test(trimmed)) {
        method = "PATCH";
    } else if (/\bdelete\b/i.test(trimmed)) {
        method = "DELETE";
    } else if (/\bget\b/i.test(trimmed)) {
        method = "GET";
    }

    // Detect explicit URL in the prompt
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urlMatch = urlRegex.exec(trimmed);
    if (urlMatch && urlMatch[0]) {
        url = urlMatch[0];
    } else {
        // Generate mock APIs based on keywords
        if (lowerPrompt.includes("user")) {
            url = "https://jsonplaceholder.typicode.com/users/1";
        } else if (lowerPrompt.includes("users")) {
            url = "https://jsonplaceholder.typicode.com/users";
        } else if (lowerPrompt.includes("posts")) {
            url = "https://jsonplaceholder.typicode.com/posts";
        } else if (lowerPrompt.includes("httpbin")) {
            if (method === "POST") {
                url = "https://httpbin.org/post";
            } else {
                url = "https://httpbin.org/get";
            }
        }
    }

    // Default bodies and headers for mutation methods
    if (method === "POST" || method === "PUT" || method === "PATCH") {
        body = {
            title: "ReqQuest API Adventure",
            body: "Exploring endpoints in the terminal.",
            userId: 1
        };
        headers = {
            "Content-Type": "application/json"
        };
    }

    // Extract query parameter limits if requested (e.g. "limit 5" -> ?_limit=5)
    const limitMatch = lowerPrompt.match(/limit\s+(\d+)/);
    if (limitMatch && limitMatch[1]) {
        query = { _limit: limitMatch[1] };
    }

    return {
        method,
        url,
        headers,
        query,
        body
    };
}
