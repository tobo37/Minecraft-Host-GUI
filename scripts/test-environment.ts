#!/usr/bin/env bun
import { spawnSync, SpawnSyncOptions } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

type CommandSpec = {
  label: string;
  cmd: string;
  args: string[];
};

function runStep(label: string, cmd: string, args: string[], options: SpawnSyncOptions = {}) {
  console.log(label);
  const result = spawnSync(cmd, args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function commandAvailable(spec: CommandSpec): CommandSpec | null {
  const result = spawnSync(spec.cmd, spec.args, {
    cwd: ROOT_DIR,
    stdio: "ignore",
  });
  return result.status === 0 ? spec : null;
}

const composeCandidates: CommandSpec[] = [
  { label: "podman compose", cmd: "podman", args: ["compose", "version"] },
  { label: "docker compose", cmd: "docker", args: ["compose", "version"] },
];

const composeCommand =
  composeCandidates.map(commandAvailable).find((spec): spec is CommandSpec => spec !== null) ??
  null;

if (!composeCommand) {
  console.error("Error: weder 'podman compose' noch 'docker compose' ist verfügbar.");
  process.exit(1);
}

const forwardArgs = process.argv.slice(2);

runStep("Installing dependencies with bun...", "bun", ["install", "--frozen-lockfile"]);
runStep("Building the project with bun run build...", "bun", ["run", "build"]);

runStep(
  `Building and starting the container test environment via ${composeCommand.label} (Ctrl+C to stop)...`,
  composeCommand.cmd,
  ["compose", "-f", "docker-compose.test.yml", "up", "--build", ...forwardArgs],
);
