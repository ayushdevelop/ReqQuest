import axios from "axios";

export async function executeRequest() {
    const response = await axios.get(
        "https://dummyjson.com/products"
    );

    return response;
}
