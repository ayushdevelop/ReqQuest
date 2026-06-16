import axios, { AxiosHeaders } from "axios";
import { type RequestConfig }
    from "../schemas/requestSchema.js";

export async function executeRequest(
    request: RequestConfig
) {
    return axios({
        method: request.method,

        url: request.url,

        headers: request.headers as AxiosHeaders,

        params: request.query,

        data: request.body
    });
}