/**
 * Integration tests for Docker container build and Jabba installation
 * Tests Requirements: 1.1, 1.2, 1.3
 */

import { spawnSync } from "node:child_process";
import { describe, test, expect } from "bun:test";

describe("Docker Container - Jabba Installation", () => {
  test("Jabba is installed in container", () => {
    const result = spawnSync("docker", [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "minecraft-host-gui",
      "bash",
      "-c",
      "which jabba",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout.toString()).toContain("jabba");
  });

  test("OpenJDK 17 is installed via Jabba", () => {
    const result = spawnSync("docker", [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "minecraft-host-gui",
      "bash",
      "-c",
      "source ~/.jabba/jabba.sh && jabba ls",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout.toString()).toContain("openjdk@1.17.0");
  });

  test("OpenJDK 17 is set as default", () => {
    const result = spawnSync("docker", [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "minecraft-host-gui",
      "bash",
      "-c",
      "source ~/.jabba/jabba.sh && jabba current",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout.toString()).toContain("openjdk@1.17.0");
  });

  test("Bun is available and functional", () => {
    const result = spawnSync("docker", [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "minecraft-host-gui",
      "bun",
      "--version",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
  });

  test("Java is accessible via Jabba environment", () => {
    const result = spawnSync("docker", [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "minecraft-host-gui",
      "bash",
      "-c",
      "source ~/.jabba/jabba.sh && jabba use default && java -version",
    ]);

    expect(result.status).toBe(0);
    const output = result.stderr.toString() + result.stdout.toString();
    expect(output).toContain("openjdk");
    expect(output).toContain("17");
  });
});
