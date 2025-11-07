/**
 * AVRORA: Web Search Tool
 *
 * Searches the internet using Tavily API and returns relevant results
 */

import { tool } from "ai";
import { z } from "zod";

const webSearchParameters = z.object({
  query: z.string().describe("The search query"),
  maxResults: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe("Maximum number of results to return (1-10)"),
  searchDepth: z
    .enum(["basic", "advanced"])
    .default("basic")
    .describe(
      "Search depth: basic for quick results, advanced for comprehensive"
    ),
});

export const webSearch = tool({
  description: `Search the internet for current information, news, facts, and answers.
Use this when you need to:
- Find current information or recent news
- Look up facts, statistics, or data
- Get answers to questions requiring up-to-date knowledge
- Research topics or verify information`,
  inputSchema: webSearchParameters,
  execute: async ({
    query,
    maxResults,
    searchDepth,
  }: z.infer<typeof webSearchParameters>) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return {
        toolName: "web-search",
        success: false,
        error: "Tavily API key not configured",
      };
    }

    try {
      console.log(`🔍 [WebSearch] Searching for: "${query}"`);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: Math.min(Math.max(1, maxResults), 10),
          search_depth: searchDepth,
          include_answer: true,
          include_images: false,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("❌ [WebSearch] Tavily API error:", error);
        return {
          toolName: "web-search",
          success: false,
          error: `Search failed: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`✅ [WebSearch] Found ${data.results?.length || 0} results`);

      return {
        toolName: "web-search",
        success: true,
        query,
        answer: data.answer || null,
        results:
          data.results?.map((result: any) => ({
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.score,
          })) || [],
        searchDepth,
      };
    } catch (error) {
      console.error("❌ [WebSearch] Error:", error);
      return {
        toolName: "web-search",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
