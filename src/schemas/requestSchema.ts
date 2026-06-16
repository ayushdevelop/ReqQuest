import { z } from "zod";

export const RequestSchema = z.object({
    method: z.enum([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ]),

    url: z.string().url(),

    headers: z
        .record(z.string(), z.string())
        .optional(),

    query: z
        .record(z.string(), z.string())
        .optional(),

    body: z.unknown().optional()
});

export type RequestConfig =
    z.infer<typeof RequestSchema>;