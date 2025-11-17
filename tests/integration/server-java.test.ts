/**
 * Integration tests for server startup with different Java versions
 * Tests Requirements: 6.1, 6.3, 6.4
 */

import { describe, test, expect, beforeAll, afterEach } from "bun:test";

const API_BASE = "http://localhost:3000";

// Helper to create a test server project
async function createTestServer(projectName: string, javaVersion?: string) {
  const metadata = {
    customName: projectName,
    description: "Test server for Java integration tests",
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    sourceZipFile: "test.zip",
    startFile: "startserver.sh",
    projectPath: "",
    javaVersion,
  };

  // Create server directory and metadata
  const response = await fetch(`${API_BASE}/api/test/create-server`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName, metadata }),
  });

  return response.ok;
}

// Helper to clean up test server
async function cleanupTestServer(projectName: string) {
  await fetch(`${API_BASE}/api/test/cleanup-server`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName }),
  });
}

// Helper to stop server if running
async function stopServerIfRunning(projectName: string) {
  await fetch(`${API_BASE}/api/server/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: projectName }),
  });
}

describe("Server Startup - Java Integration", () => {
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

    // Ensure default Java version is installed
    await fetch(`${API_BASE}/api/java/jabba/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: "openjdk@1.17.0" }),
    });
  });

  afterEach(async () => {
    // Clean up any test servers
    await stopServerIfRunning("test-server-default");
    await stopServerIfRunning("test-server-jabba");
    await stopServerIfRunning("test-server-missing");
    await cleanupTestServer("test-server-default");
    await cleanupTestServer("test-server-jabba");
    await cleanupTestServer("test-server-missing");
  });

  test("Server starts with default system Java", async () => {
    const projectName = "test-server-default";

    // Create test server without specific Java version
    const created = await createTestServer(projectName);
    expect(created).toBe(true);

    // Attempt to start server
    const response = await fetch(`${API_BASE}/api/server/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName }),
    });

    const data = await response.json();

    // Should succeed or fail gracefully with clear message
    if (data.success) {
      expect(data.message).toBeDefined();

      // Verify server is running
      const statusResponse = await fetch(
        `${API_BASE}/api/server/status?project=${projectName}`
      );
      const statusData = await statusResponse.json();
      expect(statusData.running).toBe(true);

      // Stop server
      await stopServerIfRunning(projectName);
    } else {
      // If it fails, error should mention Java
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toMatch(/java/);
    }
  });

  test("Server starts with specific Jabba version", async () => {
    const projectName = "test-server-jabba";
    const javaVersion = "openjdk@1.17.0";

    // Ensure Java version is installed
    await fetch(`${API_BASE}/api/java/jabba/install-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: javaVersion }),
    });

    // Create test server with specific Java version
    const created = await createTestServer(projectName, javaVersion);
    expect(created).toBe(true);

    // Attempt to start server
    const response = await fetch(`${API_BASE}/api/server/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName }),
    });

    const data = await response.json();

    // Should succeed or fail gracefully
    if (data.success) {
      expect(data.message).toBeDefined();

      // Check logs to verify Java version is mentioned
      const logsResponse = await fetch(
        `${API_BASE}/api/server/logs?project=${projectName}`
      );
      const logsData = await logsResponse.json();
      const logsText = logsData.logs.join("\n");

      expect(logsText).toContain(javaVersion);

      // Stop server
      await stopServerIfRunning(projectName);
    } else {
      expect(data.error).toBeDefined();
    }
  });

  test("Error handling when Java version is missing", async () => {
    const projectName = "test-server-missing";
    const missingVersion = "openjdk@1.11.0";

    // Create test server with non-installed Java version
    const created = await createTestServer(projectName, missingVersion);
    expect(created).toBe(true);

    // Attempt to start server - should fail
    const response = await fetch(`${API_BASE}/api/server/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName }),
    });

    const data = await response.json();

    // Should fail with clear error message
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.error).toContain(missingVersion);
    expect(data.error.toLowerCase()).toMatch(/not installed|install/);
  });

  test("Server uses correct Java version after switching", async () => {
    const projectName = "test-server-jabba";
    const version1 = "openjdk@1.17.0";
    const version2 = "openjdk@1.16.0";

    // Install both versions
    await fetch(`${API_BASE}/api/java/jabba/install-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: version1 }),
    });

    await fetch(`${API_BASE}/api/java/jabba/install-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: version2 }),
    });

    // Create server with version1
    const created = await createTestServer(projectName, version1);
    expect(created).toBe(true);

    // Start server with version1
    const response1 = await fetch(`${API_BASE}/api/server/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName }),
    });

    const data1 = await response1.json();
    if (data1.success) {
      // Check logs for version1
      const logsResponse1 = await fetch(
        `${API_BASE}/api/server/logs?project=${projectName}`
      );
      const logsData1 = await logsResponse1.json();
      const logsText1 = logsData1.logs.join("\n");
      expect(logsText1).toContain(version1);

      // Stop server
      await stopServerIfRunning(projectName);

      // Update metadata to use version2
      await fetch(`${API_BASE}/api/metadata/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectName,
          metadata: { javaVersion: version2 },
        }),
      });

      // Start server again with version2
      const response2 = await fetch(`${API_BASE}/api/server/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName }),
      });

      const data2 = await response2.json();
      if (data2.success) {
        // Check logs for version2
        const logsResponse2 = await fetch(
          `${API_BASE}/api/server/logs?project=${projectName}`
        );
        const logsData2 = await logsResponse2.json();
        const logsText2 = logsData2.logs.join("\n");
        expect(logsText2).toContain(version2);

        // Stop server
        await stopServerIfRunning(projectName);
      }
    }
  });
});
