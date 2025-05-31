import axios from 'axios';

const API_BASE = "http://127.0.0.1:8000"; // Single configuration point
const MAX_TOKENS = {
  REGULAR: 1000,
  LARGE: 4096,
  EXPLAIN: 2048
};

const ERROR_MESSAGES = {
  TOKEN_LIMIT: (max: number) => `Input exceeds maximum token limit (${max})`,
  API_FAILURE: "AI service unavailable - please try later",
  NETWORK: "Network error - check your connection"
};

// Token estimation helper
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Central API client
export const codegenieAPI = {
  generate: async (prompt: string) => {
    const tokens = estimateTokens(prompt);
    
    if (tokens > MAX_TOKENS.LARGE) {
      throw new Error(ERROR_MESSAGES.TOKEN_LIMIT(MAX_TOKENS.LARGE));
    }

    const endpoint = tokens > MAX_TOKENS.REGULAR ? "/generate-large" : "/generate";
    
    return apiRequest(endpoint, prompt, tokens > MAX_TOKENS.REGULAR ? MAX_TOKENS.LARGE : MAX_TOKENS.REGULAR);
  },

  explain: async (code: string) => {
    const tokens = estimateTokens(code);
    
    if (tokens > MAX_TOKENS.EXPLAIN) {
      throw new Error(ERROR_MESSAGES.TOKEN_LIMIT(MAX_TOKENS.EXPLAIN));
    }
    
    return apiRequest("/explain", code, MAX_TOKENS.EXPLAIN);
  },

  improve: async (code: string) => {
    const tokens = estimateTokens(code);
    
    if (tokens > MAX_TOKENS.LARGE) {
      throw new Error(ERROR_MESSAGES.TOKEN_LIMIT(MAX_TOKENS.LARGE));
    }
    
    return apiRequest("/improve", code, MAX_TOKENS.LARGE);
  },

  debug: async (code: string) => {
    const tokens = estimateTokens(code);
    
    if (tokens > MAX_TOKENS.LARGE) {
      throw new Error(ERROR_MESSAGES.TOKEN_LIMIT(MAX_TOKENS.LARGE));
    }
    
    return apiRequest("/debug", code, MAX_TOKENS.LARGE);
  }
};

async function apiRequest(endpoint: string, prompt: string, maxTokens: number): Promise<string> {
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, { 
      prompt, 
      max_tokens: maxTokens 
    }, {
      timeout: 60000 // 60-second timeout
    });

    if (!response.data?.response?.trim()) {
      throw new Error("Empty response from server");
    }

    return response.data.response.trim();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout - try a smaller input");
      }
      if (error.response?.status === 413) {
        throw new Error(ERROR_MESSAGES.TOKEN_LIMIT(MAX_TOKENS.LARGE));
      }
      throw new Error(ERROR_MESSAGES.API_FAILURE);
    }
    throw error instanceof Error ? error : new Error(ERROR_MESSAGES.NETWORK);
  }
}
