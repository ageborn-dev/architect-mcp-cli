# Architect MCP CLI

**Command-line interface for managing Architect MCP servers.**

The Architect CLI provides a comprehensive interface for monitoring and managing Model Context Protocol (MCP) servers, tools, and marketplaces. It allows developers and administrators to interact with their server infrastructure directly from the terminal.

## Core Features

* **Tool Management:** List, inspect, and reload server-side tools with version control awareness.
* **Marketplace Integration:** Search and install tools from both local and remote GitHub marketplaces.
* **Server Monitoring:** Access server status, metrics, audit logs, and performance statistics.
* **System Configuration:** Manage cache, permissions, schedules, and various server integrations.

## Installation

To install the CLI and its dependencies, execute the following commands in the project root:

```bash
npm install
npm run build
npm link
```

Once linked, the `architect` command will be available globally.

## Usage

### Server Configuration

By default, the CLI connects to `http://localhost:3001`. This endpoint can be configured via an environment variable or a command-line flag:

```bash
# Configure via environment variable
export ARCHITECT_SERVER=http://your-server-url

# Configure via command flag
architect --server http://your-server-url status
```

### Essential Commands

| Command | Description |
| :--- | :--- |
| `architect status` | Verifies if the server is currently reachable. |
| `architect tools list` | Displays all tools registered on the server. |
| `architect marketplace browse` | Explores the remote marketplace for new tools. |
| `architect server overview` | Displays operational metrics and execution statistics. |

### Detailed Command Reference

#### Tools

* `list`: View all tools with support for category and tag filtering.
* `source <name>`: Display the source code and configuration for a specific tool.
* `stats [name]`: View execution history, including success rates and duration metrics.
* `reload`: Triggers a refresh of the server's internal tool library.

#### Marketplace (mp)

* `list`: View tools stored in the local marketplace cache.
* `browse`: Search the remote GitHub marketplace registry.
* `search <query>`: Locate specific tools based on name or description.
* `install <name>`: Download and register a tool on the server.

#### Server

* `status` / `overview`: Basic health checks and high-level system metrics.
* `logs`: View audit logs with configurable filtering and entry limits.
* `cache stats/clear`: Monitor and manage server-side caching.
* `permissions`: Review approved capabilities for each registered tool.
* `schedules` / `webhooks` / `pipelines`: Monitor active system integrations.
* `secrets`: List stored secret names (values remain encrypted and hidden).

## Development

The project is developed using TypeScript and utilizes ECMAScript Modules (ESM).

### Operational Scripts

* `npm run build`: Compiles TypeScript source files into the `dist/` directory.
* `npm run dev`: Executes the CLI directly using `ts-node`.
* `npm run clean`: Removes the build output directory.

### Project Organization

```text
architect-mcp-cli/
├── src/
│   ├── index.ts        # Primary CLI entry point
│   ├── commands/       # Feature-specific command implementations
│   └── utils/          # Shared API, output, and utility functions
├── package.json
└── tsconfig.json
```

## License

This project is licensed under the MIT License.
