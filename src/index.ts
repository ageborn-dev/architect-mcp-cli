import { Command } from "commander";
import chalk from "chalk";
import { registerToolsCommands } from "./commands/tools.js";
import { registerMarketplaceCommands } from "./commands/marketplace.js";
import { registerServerCommands } from "./commands/server.js";

const program = new Command();

program
  .name("architect")
  .description(
    chalk.cyan("⚡ Architect MCP CLI") +
    "\n  Manage your Architect MCP server from the terminal"
  )
  .version("0.2.0")
  .option("--server <url>", "Server URL (default: http://localhost:3001)", (url) => {
    process.env.ARCHITECT_SERVER = url;
  })
  .hook("preAction", () => {

  });

registerToolsCommands(program);
registerMarketplaceCommands(program);
registerServerCommands(program);


program
  .command("status")
  .description("Quick check: is the server running?")
  .action(async () => {
    const { apiGet, getServerUrl } = await import("./utils/api.js");
    const { default: chalk } = await import("chalk");
    try {
      await apiGet("overview");
      console.log(chalk.green("✓") + " Server is running at " + chalk.cyan(getServerUrl()));
    } catch {
      console.error(chalk.red("✗") + " Server is not running at " + chalk.cyan(getServerUrl()));
      process.exit(1);
    }
  });

program.on("command:*", (operands) => {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log(`Run ${chalk.cyan("architect --help")} for available commands`);
  process.exit(1);
});

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}

