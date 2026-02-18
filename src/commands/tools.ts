import { Command } from "commander";
import { apiGet, apiPost } from "../utils/api.js";
import { withSpinner } from "../utils/spinner.js";
import * as out from "../utils/output.js";
import chalk from "chalk";

interface Tool {
  name: string;
  description: string;
  version: number;
  active: boolean;
  category?: string;
  tags?: string[];
  capabilities?: { type: string }[];
  createdAt: string;
  updatedAt: string;
  code?: string;
  schema?: unknown;
  rateLimit?: { maxCallsPerMinute: number; maxCallsPerHour: number };
  dependencies?: string[];
  author?: string;
}

interface Stats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDurationMs: number;
  lastExecutedAt?: string;
}

export function registerToolsCommands(program: Command): void {

  const tools = program
    .command("tools")
    .description("Manage Architect tools");

  tools
    .command("list")
    .description("List all tools")
    .option("-a, --active", "Show only active tools")
    .option("-c, --category <category>", "Filter by category")
    .option("-t, --tag <tag>", "Filter by tag")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching tools...", () =>
          apiGet<Tool[]>("tools")
        );

        let filtered = data;
        if (opts.active) filtered = filtered.filter(t => t.active);
        if (opts.category) filtered = filtered.filter(t => t.category === opts.category);
        if (opts.tag) filtered = filtered.filter(t => t.tags?.includes(opts.tag));

        if (opts.json) {
          out.json(filtered);
          return;
        }

        if (filtered.length === 0) {
          out.emptyState("no tools found");
          return;
        }

        out.header(`Tools (${filtered.length})`);
        out.table(
          ["Name", "Status", "Version", "Category", "Tags"],
          filtered.map(t => [
            chalk.bold(t.name),
            t.active ? chalk.green("active") : chalk.dim("inactive"),
            `v${t.version}`,
            t.category || "other",
            (t.tags || []).map(tag => chalk.cyan(`#${tag}`)).join(" ") || chalk.dim("none"),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  tools
    .command("source <name>")
    .description("Show tool source code and configuration")
    .option("--json", "Output as JSON")
    .action(async (name: string, opts) => {
      try {
        const data = await withSpinner(`Fetching ${name}...`, () =>
          apiGet<Tool[]>("tools")
        );

        const tool = data.find(t => t.name === name);
        if (!tool) {
          out.error(`Tool '${name}' not found`);
          process.exit(1);
        }

        if (opts.json) {
          out.json(tool);
          return;
        }

        out.header(`Tool: ${tool.name}`);
        out.label("Status", tool.active ? "active" : "inactive");
        out.label("Version", `v${tool.version}`);
        out.label("Category", tool.category || "other");
        out.label("Tags", (tool.tags || []).join(", ") || "none");
        out.label("Author", tool.author || "unknown");
        out.label("Dependencies", (tool.dependencies || []).join(", ") || "none");
        out.label("Created", new Date(tool.createdAt).toLocaleString());
        out.label("Updated", new Date(tool.updatedAt).toLocaleString());

        if (tool.capabilities && tool.capabilities.length > 0) {
          console.log();
          out.label("Capabilities", tool.capabilities.map(c => c.type).join(", "));
        }

        if (tool.rateLimit) {
          console.log();
          out.label("Rate Limit", `${tool.rateLimit.maxCallsPerMinute}/min, ${tool.rateLimit.maxCallsPerHour}/hr`);
        }

        console.log();
        console.log(chalk.dim("Description:"));
        console.log("  " + tool.description);

        if (tool.code) {
          console.log();
          console.log(chalk.dim("Code:"));
          console.log(chalk.yellow(tool.code));
        }
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  tools
    .command("stats [name]")
    .description("Show execution statistics for tools")
    .option("--json", "Output as JSON")
    .action(async (name: string | undefined, opts) => {
      try {
        const data = await withSpinner("Fetching stats...", () =>
          apiGet<Record<string, Stats>>("stats")
        );

        if (opts.json) {
          out.json(name ? { [name]: data[name] } : data);
          return;
        }

        const entries = name
          ? Object.entries(data).filter(([k]) => k === name)
          : Object.entries(data);

        if (entries.length === 0) {
          out.emptyState(name ? `no stats for '${name}'` : "no execution stats yet");
          return;
        }

        out.header("Execution Stats");
        out.table(
          ["Tool", "Total", "Success", "Failed", "Avg Duration", "Last Run"],
          entries.map(([toolName, s]) => {
            const rate = s.totalCalls > 0
              ? ((s.successfulCalls / s.totalCalls) * 100).toFixed(1) + "%"
              : "0%";
            return [
              chalk.bold(toolName),
              s.totalCalls,
              chalk.green(String(s.successfulCalls)),
              s.failedCalls > 0 ? chalk.red(String(s.failedCalls)) : "0",
              `${s.averageDurationMs}ms`,
              s.lastExecutedAt ? new Date(s.lastExecutedAt).toLocaleString() : chalk.dim("never"),
            ];
          })
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  tools
    .command("reload")
    .description("Reload all approved tools on the server")
    .action(async () => {
      try {
        const result = await withSpinner("Reloading tools...", () =>
          apiPost<{ loaded: number; skipped: number; failed: number }>("tools/reload")
        );

        out.success(`Tools reloaded`);
        out.label("Loaded", result.loaded);
        out.label("Skipped", result.skipped);
        out.label("Failed", result.failed);
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });
}

