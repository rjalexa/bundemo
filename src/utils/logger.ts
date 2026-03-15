/**
 * 🎨 Colorful Console Logger
 * Demonstrates Bun's full ANSI color support and Bun.env usage
 */

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
} as const;

type LogLevel = "info" | "warn" | "error" | "debug" | "success";

const levelConfig: Record<LogLevel, { color: string; icon: string; label: string }> = {
  info:    { color: colors.cyan,    icon: "◆", label: "INFO " },
  warn:    { color: colors.yellow,  icon: "▲", label: "WARN " },
  error:   { color: colors.red,     icon: "✖", label: "ERROR" },
  debug:   { color: colors.magenta, icon: "◇", label: "DEBUG" },
  success: { color: colors.green,   icon: "✔", label: " OK  " },
};

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const config = levelConfig[level];
  const isVerbose = Bun.env.LOG_LEVEL === "debug";

  if (level === "debug" && !isVerbose) return;

  const ts = `${colors.dim}${timestamp()}${colors.reset}`;
  const badge = `${config.color}${colors.bold} ${config.icon} ${config.label} ${colors.reset}`;
  const msg = `${config.color}${message}${colors.reset}`;

  let output = `${ts} ${badge} ${msg}`;

  if (meta && isVerbose) {
    const metaStr = JSON.stringify(meta, null, 2)
      .split("\n")
      .map((line) => `         ${colors.dim}${line}${colors.reset}`)
      .join("\n");
    output += `\n${metaStr}`;
  }

  console.log(output);
}

export const logger = {
  info:    (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn:    (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error:   (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
  debug:   (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  success: (msg: string, meta?: Record<string, unknown>) => log("success", msg, meta),

  /** Print a styled banner */
  banner(text: string): void {
    const line = "═".repeat(text.length + 4);
    console.log(`\n${colors.cyan}${colors.bold}╔${line}╗`);
    console.log(`║  ${text}  ║`);
    console.log(`╚${line}╝${colors.reset}\n`);
  },

  /** Print a key-value table */
  table(title: string, entries: Record<string, string | number>): void {
    console.log(`\n${colors.bold}${colors.blue}  ${title}${colors.reset}`);
    console.log(`${colors.dim}  ${"─".repeat(40)}${colors.reset}`);
    for (const [key, value] of Object.entries(entries)) {
      const k = `${colors.dim}  ${key.padEnd(20)}${colors.reset}`;
      const v = `${colors.white}${value}${colors.reset}`;
      console.log(`${k} ${v}`);
    }
    console.log();
  },
};
