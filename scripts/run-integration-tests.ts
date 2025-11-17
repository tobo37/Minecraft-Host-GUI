#!/usr/bin/env bun
/**
 * Script to run integration tests with proper environment setup
 */

import { spawnSync, spawn, type ChildProcess } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

type CommandSpec = {
  label: string;
  cmd: string;
  args: string[];
};

function commandAvailable(spec: CommandSpec): CommandSpec | null {
  const result = spawnSync(spec.cmd, spec.args, {
    cwd: ROOT_DIR,
    stdio: "ignore",
  });
  return result.status === 0 ? spec : null;
}

function runStep(
  label: string,
  cmd: string,
  args: string[],
  options: { cwd?: string; stdio?: "inherit" | "ignore" } = {}
) {
  console.log(`\n${label}`);
  const result = spawnSync(cmd, args, {
    cwd: options.cwd || ROOT_DIR,
    stdio: options.stdio || "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function waitForServer(url: string, maxRetries = 30): Promise<boolean> {
  console.log(`\nWaiting for server at ${url}...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log("✓ Server is ready");
        return true;
      }
    } catch {
      // Server not ready yet
    }

    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n✗ Server failed to start");
  return false;
}

async function main() {
  console.log("========================================");
  console.log("Integration Tests Setup");
  console.log("========================================");

  // Detect compose command
  const composeCandidates: CommandSpec[] = [
    { label: "podman compose", cmd: "podman", args: ["compose", "version"] },
    { label: "docker compose", cmd: "docker", args: ["compose", "version"] },
  ];

  const composeCommand = composeCandidates
    .map(commandAvailable)
    .find((spec): spec is CommandSpec => spec !== null);

  if (!composeCommand) {
    console.error(
      "Error: Neither 'podman compose' nor 'docker compose' is available."
    );
    process.exit(1);
  }

  console.log(`Using: ${composeCommand.label}`);

  // Build the project
  runStep("Building project...", "bun", ["run", "build"]);

  // Start container in background
  console.log("\nStarting container environment...");
  const containerProcess = spawn(
    composeCommand.cmd,
    ["compose", "-f", "docker-compose.test.yml", "up", "--build"],
    {
      cwd: ROOT_DIR,
      stdio: "pipe",
    }
  );

  // Capture container output
  containerProcess.stdout?.on("data", (data) => {
    process.stdout.write(data);
  });

  containerProcess.stderr?.on("data", (data) => {
    process.stderr.write(data);
  });

  // Wait for server to be ready
  const serverReady = await waitForServer(
    "http://localhost:3000/api/java/jabba/info"
  );

  if (!serverReady) {
    console.error("Failed to start server. Stopping container...");
    containerProcess.kill();
    process.exit(1);
  }

  // Run tests
  console.log("\n========================================");
  console.log("Running Integration Tests");
  console.log("========================================\n");

  const testResult = spawnSync("bun", ["test", "tests/integration/"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  // Cleanup: Stop container
  console.log("\n========================================");
  console.log("Cleaning Up");
  console.log("========================================\n");

  runStep(
    "Stopping container...",
    composeCommand.cmd,
    ["compose", "-f", "docker-compose.test.yml", "down"],
    { stdio: "ignore" }
  );

  containerProcess.kill();

  // Exit with test result status
  process.exit(testResult.status ?? 0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
