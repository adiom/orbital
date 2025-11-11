import { tool } from "ai";
import { z } from "zod";
import { generateUUID } from "@/lib/utils";

const chartInput = z.object({
  title: z.string().min(2).describe("Title of the chart"),
  xLabel: z.string().min(1).default("x"),
  yLabel: z.string().min(1).default("y"),
  type: z
    .enum(["line", "bar", "pie", "scatter"]) // Fast enum subset
    .default("line"),
  data: z
    .array(z.object({ label: z.string(), values: z.array(z.number()) }))
    .min(1)
    .describe("Dataset series with labels and numeric values"),
});

export const createChart = tool({
  description:
    "Generate a lightweight chart specification for immediate rendering (no external APIs).",
  inputSchema: chartInput,
  execute: async ({ title, xLabel, yLabel, type, data }) => {
    const id = generateUUID();
    // Compute quick stats for each series (performance: O(n))
    const seriesStats = data.map((series) => {
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      for (const v of series.values) {
        if (v < min) min = v;
        if (v > max) max = v;
        sum += v;
      }
      const mean = series.values.length ? sum / series.values.length : 0;
      return { label: series.label, min, max, mean };
    });

    return {
      toolName: "create-chart",
      id,
      title,
      type,
      axis: { x: xLabel, y: yLabel },
      data,
      stats: seriesStats,
      specVersion: 1,
      message: "Chart specification created",
    };
  },
});

