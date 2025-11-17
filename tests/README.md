# Integration Tests for Jabba Java Management

This directory contains integration tests for the Jabba Java management functionality.

## Test Structure

- `integration/docker-jabba.test.ts` - Tests Docker container build and Jabba installation
- `integration/jabba-api.test.ts` - Tests Java version installation and switching via API
- `integration/server-java.test.ts` - Tests server startup with different Java versions

## Prerequisites

1. Docker or Podman with compose support
2. Bun runtime installed
3. Project built (`bun run build`)

## Running Tests

### Run All Integration Tests

```bash
bun test tests/integration/
```

### Run Specific Test Suite

```bash
# Docker container tests
bun test tests/integration/docker-jabba.test.ts

# API tests
bun test tests/integration/jabba-api.test.ts

# Server startup tests
bun test tests/integration/server-java.test.ts
```

### Run Tests with Container Environment

The Docker container tests require a running container. Use the test environment script:

```bash
# Start test environment (builds and starts container)
bun run test:environment

# In another terminal, run the tests
bun test tests/integration/
```

## Test Coverage

### Requirements Coverage

- **Requirement 1.1, 1.2, 1.3**: Docker container build and Jabba installation
- **Requirement 3.1, 3.2, 3.3, 3.4**: Java version installation and switching
- **Requirement 6.1, 6.3, 6.4**: Server startup with different Java versions

### Test Scenarios

#### Docker Container Tests

- ✓ Jabba is installed in container
- ✓ OpenJDK 17 is installed via Jabba
- ✓ OpenJDK 17 is set as default
- ✓ Bun is available and functional
- ✓ Java is accessible via Jabba environment

#### API Tests

- ✓ Get Jabba info returns installed versions
- ✓ Install a new Java version via API
- ✓ Installing already-installed version returns alreadyInstalled flag
- ✓ Switch between installed versions
- ✓ Error handling for invalid version format
- ✓ Error handling for non-existent version
- ✓ Switch back to default version

#### Server Startup Tests

- ✓ Server starts with default system Java
- ✓ Server starts with specific Jabba version
- ✓ Error handling when Java version is missing
- ✓ Server uses correct Java version after switching

## Notes

- Docker container tests require the container to be running
- API tests require the application server to be running on port 3000
- Server startup tests create temporary test servers that are cleaned up after each test
- Tests use real Jabba commands and installations (no mocking)

## Troubleshooting

### Container Not Running

If Docker container tests fail, ensure the container is running:

```bash
docker compose -f docker-compose.test.yml up -d
```

### Server Not Responding

If API tests fail to connect, ensure the server is running:

```bash
bun run start
```

### Permission Issues

On Unix systems, ensure test scripts have execute permissions:

```bash
chmod +x tests/integration/*.test.ts
```
