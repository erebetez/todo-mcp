# todo-mcp

A shared todo list backed by SQLite, exposed two ways:

- **MCP server** (`server/src/mcpServer.js`) — stdio MCP server for LLM clients (Claude Code, Claude Desktop, etc.) to add/list/update/complete todos.
- **REST API** (`server/src/apiServer.js`) — small Express API on `:3001` used by the React frontend.
- **Web UI** (`web/`) — React (Vite) app with an editable table showing all todos.

Both the MCP server and the REST API read/write the same `server/todo.db` SQLite file, so anything the LLM adds or completes shows up live in the web UI (it polls every 5s).

## Todo fields

`id, description, done, date_created, date_planned, date_done, done_by, created_by`

## Setup

```bash
cd server && npm install
cd ../web && npm install
```

## Running the web UI + API

```bash
# terminal 1
cd server && npm run api

# terminal 2
cd web && npm run dev
```

Open http://localhost:5173.

## Registering the MCP server

Point your MCP client at:

```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["D:/code/ai/yaaia/todo-mcp/server/src/mcpServer.js"]
    }
  }
}
```

Tools exposed: `add_todo`, `list_todos`, `get_todo`, `update_todo`, `complete_todo`, `reopen_todo`, `delete_todo`.

By default the MCP server and REST API both use `server/todo.db`. Set `TODO_DB_PATH` to point either process at a different file.
