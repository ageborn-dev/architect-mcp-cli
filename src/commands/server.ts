import { Command } from "commander";
import { apiGet, apiDelete, apiPost, getServerUrl } from "../utils/api.js";
import { withSpinner } from "../utils/spinner.js";
import * as out from "../utils/output.js";
import chalk from "chalk";

interface Overview {
  totalTools: number;
  activeTools: number;
  totalCalls: number;
  totalSuccess: number;
  totalFailed: number;
  cacheHitRate: number;
  schedulesCount: number;
  webhooksCount: number;
  pipelinesCount: number;
  aliasesCount: number;
}

interface AuditEntry {
  timestamp: string;
  action: string;
  toolName: string;
  duration?: number;
  details?: Record<string, unknown>;
}

interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  entriesByTool: Record<string, number>;
}

export function registerServerCommands(program: Command): void {

  const server = program
    .command("server")
    .description("Monitor and manage the Architect server");

  server
    .command("status")
    .description("Check if the server is running")
    .action(async () => {
      const url = getServerUrl();
      try {
        await withSpinner("Checking server...", () =>
          apiGet("overview")
        );
        out.success(`Server is running at ${chalk.cyan(url)}`);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("Cannot connect")) {
          out.error(`Server is not running at ${chalk.cyan(url)}`);
          console.log(chalk.dim(`  Set ARCHITECT_SERVER env variable to change the URL`));
        } else {
          out.error(msg);
        }
        process.exit(1);
      }
    });

  server
    .command("overview")
    .description("Show server overview and stats")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching overview...", () =>
          apiGet<Overview>("overview")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        out.header("Architect Server Overview");
        out.printServerUrl(getServerUrl());
        console.log();

        const successRate = data.totalCalls > 0
          ? ((data.totalSuccess / data.totalCalls) * 100).toFixed(1)
          : "0.0";

        out.table(
          ["Metric", "Value"],
          [
            ["Total Tools", data.totalTools],
            ["Active Tools", chalk.green(String(data.activeTools))],
            ["Total Executions", data.totalCalls],
            ["Success Rate", chalk.green(`${successRate}%`)],
            ["Failed", data.totalFailed > 0 ? chalk.red(String(data.totalFailed)) : "0"],
            ["Cache Hit Rate", chalk.cyan(`${data.cacheHitRate}%`)],
            ["Schedules", data.schedulesCount],
            ["Webhooks", data.webhooksCount],
            ["Pipelines", data.pipelinesCount],
            ["Aliases", data.aliasesCount],
          ]
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  server
    .command("logs")
    .description("Show audit logs")
    .option("-n, --limit <n>", "Number of entries to show", "50")
    .option("-t, --tool <tool>", "Filter by tool name")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const params: Record<string, string | number> = {
          limit: parseInt(opts.limit),
        };
        if (opts.tool) params.tool = opts.tool;

        const data = await withSpinner("Fetching logs...", () =>
          apiGet<AuditEntry[]>("audit", params)
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState("no audit logs yet");
          return;
        }

        out.header(`Audit Logs (${data.length})`);
        out.table(
          ["Time", "Action", "Tool", "Duration"],
          data.map(log => [
            chalk.dim(new Date(log.timestamp).toLocaleString()),
            chalk.cyan(log.action),
            log.toolName,
            log.duration ? `${log.duration}ms` : chalk.dim("—"),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  const cache = server
    .command("cache")
    .description("Manage the server cache");

  cache
    .command("stats")
    .description("Show cache statistics")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching cache stats...", () =>
          apiGet<CacheStats>("cache")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        out.header("Cache Stats");
        out.table(
          ["Metric", "Value"],
          [
            ["Total Entries", data.totalEntries],
            ["Hits", chalk.green(String(data.hits))],
            ["Misses", chalk.yellow(String(data.misses))],
            ["Hit Rate", chalk.cyan(`${data.hitRate}%`)],
          ]
        );

        if (Object.keys(data.entriesByTool).length > 0) {
          console.log();
          out.header("Entries by Tool");
          out.table(
            ["Tool", "Entries"],
            Object.entries(data.entriesByTool).map(([tool, count]) => [
              chalk.bold(tool),
              count,
            ])
          );
        }
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  cache
    .command("clear [tool]")
    .description("Clear cache for a tool or all tools")
    .action(async (tool?: string) => {
      try {
        const params = tool ? { tool } : undefined;
        const result = await withSpinner(
          tool ? `Clearing cache for '${tool}'...` : "Clearing all cache...",
          () => apiDelete<{ cleared: number }>("cache", params)
        );

        out.success(`Cleared ${result.cleared} cache ${result.cleared === 1 ? "entry" : "entries"}`);
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  server
    .command("permissions")
    .description("List all tool permissions")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching permissions...", () =>
          apiGet<{ toolName: string; toolVersion: number; approvedCapabilities: { type: string }[]; approvedAt: string }[]>("permissions")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState("no permissions configured");
          return;
        }

        out.header(`Permissions (${data.length})`);
        out.table(
          ["Tool", "Version", "Capabilities", "Approved At"],
          data.map(p => [
            chalk.bold(p.toolName),
            `v${p.toolVersion}`,
            p.approvedCapabilities.map(c => chalk.yellow(c.type)).join(", "),
            new Date(p.approvedAt).toLocaleString(),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  server
    .command("schedules")
    .description("List all scheduled tool runs")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching schedules...", () =>
          apiGet<{ id: string; toolName: string; cron: string; enabled: boolean; lastRun?: string; nextRun?: string }[]>("schedules")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState("no schedules configured");
          return;
        }

        out.header(`Schedules (${data.length})`);
        out.table(
          ["ID", "Tool", "Cron", "Status", "Last Run", "Next Run"],
          data.map(s => [
            chalk.dim(s.id.substring(0, 16) + "..."),
            chalk.bold(s.toolName),
            chalk.cyan(s.cron),
            s.enabled ? chalk.green("enabled") : chalk.dim("disabled"),
            s.lastRun ? new Date(s.lastRun).toLocaleString() : chalk.dim("never"),
            s.nextRun ? new Date(s.nextRun).toLocaleString() : chalk.dim("n/a"),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  server
    .command("webhooks")
    .description("List all configured webhooks")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching webhooks...", () =>
          apiGet<{ id: string; toolName: string; path: string; method: string; enabled: boolean; secret?: string }[]>("webhooks")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState("no webhooks configured");
          return;
        }

        out.header(`Webhooks (${data.length})`);
        out.table(
          ["ID", "Tool", "Path", "Method", "Status", "Secret"],
          data.map(w => [
            chalk.dim(w.id.substring(0, 12) + "..."),
            chalk.bold(w.toolName),
            chalk.cyan(`/webhook${w.path}`),
            chalk.blue(w.method),
            w.enabled ? chalk.green("enabled") : chalk.dim("disabled"),
            w.secret ? chalk.green("✓") : chalk.dim("—"),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  server
    .command("pipelines")
    .description("List all configured pipelines")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching pipelines...", () =>
          apiGet<{ name: string; description: string; steps: { tool: string }[] }[]>("pipelines")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState("no pipelines defined");
          return;
        }

        out.header(`Pipelines (${data.length})`);
        out.table(
          ["Name", "Description", "Steps"],
          data.map(p => [
            chalk.bold(p.name),
            p.description,
            chalk.cyan(String(p.steps.length)) + " → " + p.steps.map(s => s.tool).join(" → "),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  server
    .command("secrets")
    .description("List stored secret names (values never shown)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching secrets...", () =>
          apiGet<{ name: string; createdAt: string; updatedAt: string }[]>("secrets")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState("no secrets stored");
          return;
        }

        out.header(`Secrets (${data.length})`);
        out.info("Secret values are never displayed");
        console.log();
        out.table(
          ["Name", "Created", "Updated"],
          data.map(s => [
            chalk.bold(s.name),
            new Date(s.createdAt).toLocaleString(),
            new Date(s.updatedAt).toLocaleString(),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });
}

