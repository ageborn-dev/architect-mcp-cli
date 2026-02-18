import chalk from "chalk";
import Table from "cli-table3";

export function success(msg: string): void {
  console.log(chalk.green("✓") + " " + msg);
}

export function error(msg: string): void {
  console.error(chalk.red("✗") + " " + msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow("⚠") + " " + msg);
}

export function info(msg: string): void {
  console.log(chalk.blue("ℹ") + " " + msg);
}

export function label(key: string, value: string | number | boolean): void {
  console.log(chalk.dim(key + ":") + " " + chalk.white(String(value)));
}

export function header(title: string): void {
  console.log();
  console.log(chalk.bold.cyan(title));
  console.log(chalk.dim("─".repeat(title.length)));
}

export function divider(): void {
  console.log(chalk.dim("─".repeat(50)));
}

export function badge(text: string, color: "green" | "red" | "yellow" | "blue" | "gray"): string {
  const colors = {
    green: chalk.bgGreen.black,
    red: chalk.bgRed.white,
    yellow: chalk.bgYellow.black,
    blue: chalk.bgBlue.white,
    gray: chalk.bgGray.white,
  };
  return colors[color](` ${text} `);
}

export function statusBadge(active: boolean): string {
  return active ? badge("ACTIVE", "green") : badge("INACTIVE", "gray");
}

export function table(
  headers: string[],
  rows: (string | number)[][]
): void {
  const t = new Table({
    head: headers.map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: ["dim"],
    },
  });

  rows.forEach(row => t.push(row.map(cell => String(cell))));
  console.log(t.toString());
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printServerUrl(url: string): void {
  console.log(chalk.dim(`Server: ${url}`));
}

export function emptyState(message: string): void {
  console.log(chalk.dim(`  (${message})`));
}

export function count(n: number, singular: string, plural?: string): string {
  const word = n === 1 ? singular : (plural || singular + "s");
  return chalk.bold(String(n)) + " " + word;
}

