/**
 * Integration tests for Java version installation and switching via API
 * Tests Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { describe, test, expect, beforeAll } from "bun:test";

const API_BASE = "http://localhost:3000";

describe("Jabba API - Version Management", () => {
  beforeAll(async () => {
    // Wait for server to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        const response = await fetch(`${API_BASE}/api/java/jabba/info`);
        if (response.ok) break;
      } catch {
        // Server not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries--;
    }
  });

  test("Get Jabba info returns installed versions", async () => {
    const response = await fetch(`${API_BASE}/api/java/jabba/info`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.installed).toBe(true);
    expect(Array.isArray(data.versions)).toBe(true);
    expect(data.versions).toContain("openjdk@1.17.0");
    expect(data.current).toBeDefined();
  });

  test("Install a new Java version via API", async () => {
    const version = "openjdk@1.16.0";

    const response = await fetch(`${API_BASE}/api/java/jabba/install-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify version is now installed
    const infoResponse = await fetch(`${API_BASE}/api/java/jabba/info`);
    const infoData = await infoResponse.json();
    expect(infoData.versions).toContain(version);
  });

  test("Installing already-installed version returns alreadyInstalled flag", async () => {
    const version = "openjdk@1.17.0";

    const response = await fetch(`${API_BASE}/api/java/jabba/install-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.alreadyInstalled).toBe(true);
  });

  test("Switch between installed versions", async () => {
    const version = "openjdk@1.16.0";

    const response = await fetch(`${API_BASE}/api/java/jabba/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify current version changed
    const infoResponse = await fetch(`${API_BASE}/api/java/jabba/info`);
    const infoData = await infoResponse.json();
    expect(infoData.current).toBe(version);
  });

  test("Error handling for invalid version format", async () => {
    const invalidVersion = "invalid-version-format";

    const response = await fetch(`${API_BASE}/api/java/jabba/install-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: invalidVersion }),
    });

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test("Error handling for non-existent version", async () => {
    const nonExistentVersion = "openjdk@99.99.99";

    const response = await fetch(`${API_BASE}/api/java/jabba/install-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: nonExistentVersion }),
    });

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test("Switch back to default version", async () => {
    const defaultVersion = "openjdk@1.17.0";

    const response = await fetch(`${API_BASE}/api/java/jabba/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: defaultVersion }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
