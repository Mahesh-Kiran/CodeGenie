import axios from 'axios';

export async function fetchAICompletion(
  prompt: string,
  apiUrl: string,
  max_tokens = 1000
): Promise<string> {
  try {
    const response = await axios.post(apiUrl, { prompt, max_tokens });
    return response.data.response?.trim() || "";
  } catch (error) {
    console.error("❌ API Error:", error);
    throw new Error("Failed to get response from AI backend"); // Throw meaningful error
  }
}
