import { Command } from "commander";
import { apiGet, apiPost } from "../utils/api.js";
import { withSpinner } from "../utils/spinner.js";
import * as out from "../utils/output.js";
import chalk from "chalk";

interface MarketplaceEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  tags: string[];
  exportedAt: string;
  owner_login?: string;
}

export function registerMarketplaceCommands(program: Command): void {

  const marketplace = program
    .command("marketplace")
    .alias("mp")
    .description("Browse and manage the tool marketplace");

  marketplace
    .command("list")
    .description("List tools in your local marketplace")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await withSpinner("Fetching local marketplace...", () =>
          apiGet<MarketplaceEntry[]>("marketplace")
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState("local marketplace is empty");
          return;
        }

        out.header(`Local Marketplace (${data.length})`);
        out.table(
          ["Name", "Version", "Author", "Category", "Tags"],
          data.map(e => [
            chalk.bold(e.name),
            `v${e.version}`,
            e.author,
            e.category,
            (e.tags || []).map(t => chalk.cyan(`#${t}`)).join(" ") || chalk.dim("none"),
          ])
        );
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command("browse")
    .description("Browse the remote GitHub marketplace")
    .option("-q, --query <query>", "Search by name, description, or tags")
    .option("-c, --category <category>", "Filter by category")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const params: Record<string, string> = {};
        if (opts.query) params.query = opts.query;
        if (opts.category) params.category = opts.category;

        const data = await withSpinner("Browsing remote marketplace...", () =>
          apiGet<MarketplaceEntry[]>("marketplace/remote", params)
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState(opts.query ? `no tools matching '${opts.query}'` : "remote marketplace is empty");
          return;
        }

        out.header(`Remote Marketplace (${data.length})`);
        out.table(
          ["Name", "Version", "Author", "Category", "Tags"],
          data.map(e => [
            chalk.bold(e.name),
            `v${e.version}`,
            e.owner_login || e.author,
            e.category,
            (e.tags || []).map(t => chalk.cyan(`#${t}`)).join(" ") || chalk.dim("none"),
          ])
        );

        console.log();
        out.info(`Install a tool with: architect marketplace install <name>`);
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command("install <name>")
    .description("Install a tool from the remote marketplace")
    .option("--overwrite", "Overwrite if tool already exists locally")
    .action(async (name: string, opts) => {
      try {
        const result = await withSpinner(`Installing ${name}...`, () =>
          apiPost<{ success: boolean; message: string }>("marketplace/install", {
            id: name,
            overwrite: opts.overwrite || false,
          })
        );

        if (result.success) {
          out.success(`Tool '${name}' installed successfully`);
          out.info(`Run 'architect tools list' to see it`);
        } else {
          out.error(result.message || `Failed to install '${name}'`);
          process.exit(1);
        }
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });

  marketplace
    .command("search <query>")
    .description("Search the remote marketplace")
    .option("--json", "Output as JSON")
    .action(async (query: string, opts) => {
      try {
        const data = await withSpinner(`Searching for '${query}'...`, () =>
          apiGet<MarketplaceEntry[]>("marketplace/remote", { query })
        );

        if (opts.json) {
          out.json(data);
          return;
        }

        if (data.length === 0) {
          out.emptyState(`no tools found matching '${query}'`);
          return;
        }

        out.header(`Search Results for '${query}' (${data.length})`);

        data.forEach(e => {
          console.log();
          console.log(chalk.bold.white(e.name) + chalk.dim(` v${e.version}`) + " by " + chalk.cyan(e.owner_login || e.author));
          console.log("  " + e.description);
          console.log("  " + (e.tags || []).map(t => chalk.dim(`#${t}`)).join(" "));
        });

        console.log();
        out.info(`Install with: architect marketplace install <name>`);
      } catch (err) {
        out.error((err as Error).message);
        process.exit(1);
      }
    });
}

