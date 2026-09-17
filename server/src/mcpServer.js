import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as todos from "./db.js";

const server = new McpServer({
  name: "todo-mcp",
  version: "1.0.0",
});

function asText(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

server.registerTool(
  "add_todo",
  {
    title: "Add todo",
    description: "Create a new todo item on the shared todo list.",
    inputSchema: {
      description: z.string().describe("What needs to be done"),
      date_planned: z
        .string()
        .optional()
        .describe("ISO date/time this task is planned for, if any"),
      created_by: z
        .string()
        .optional()
        .describe("Who/what created this task, e.g. 'assistant' or a user name"),
    },
  },
  async ({ description, date_planned, created_by }) => {
    const todo = todos.addTodo({ description, date_planned, created_by });
    return asText(todo);
  }
);

server.registerTool(
  "list_todos",
  {
    title: "List todos",
    description: "List todo items, optionally filtered by status.",
    inputSchema: {
      status: z
        .enum(["all", "open", "done"])
        .optional()
        .describe("Filter by status, defaults to 'all'"),
    },
  },
  async ({ status }) => {
    return asText(todos.listTodos({ status: status || "all" }));
  }
);

server.registerTool(
  "get_todo",
  {
    title: "Get todo",
    description: "Get a single todo item by id.",
    inputSchema: { id: z.number().int() },
  },
  async ({ id }) => {
    const todo = todos.getTodo(id);
    if (!todo) return { content: [{ type: "text", text: `No todo with id ${id}` }], isError: true };
    return asText(todo);
  }
);

server.registerTool(
  "update_todo",
  {
    title: "Update todo",
    description: "Update fields on an existing todo item (description, planned date, etc).",
    inputSchema: {
      id: z.number().int(),
      description: z.string().optional(),
      date_planned: z.string().nullable().optional(),
      resolution: z
        .string()
        .nullable()
        .optional()
        .describe("Notes on how this was/should be resolved, useful for recurring todos"),
    },
  },
  async ({ id, ...fields }) => {
    const todo = todos.updateTodo(id, fields);
    if (!todo) return { content: [{ type: "text", text: `No todo with id ${id}` }], isError: true };
    return asText(todo);
  }
);

server.registerTool(
  "complete_todo",
  {
    title: "Complete todo",
    description: "Mark a todo item as done, recording who/what completed it.",
    inputSchema: {
      id: z.number().int(),
      done_by: z.string().optional().describe("Who/what completed this task"),
      resolution: z
        .string()
        .optional()
        .describe("How this was resolved, useful for fixing recurring todos faster next time"),
    },
  },
  async ({ id, done_by, resolution }) => {
    const todo = todos.completeTodo(id, done_by, resolution ?? null);
    if (!todo) return { content: [{ type: "text", text: `No todo with id ${id}` }], isError: true };
    return asText(todo);
  }
);

server.registerTool(
  "reopen_todo",
  {
    title: "Reopen todo",
    description: "Mark a done todo item as not done again.",
    inputSchema: { id: z.number().int() },
  },
  async ({ id }) => {
    const todo = todos.updateTodo(id, { done: false });
    if (!todo) return { content: [{ type: "text", text: `No todo with id ${id}` }], isError: true };
    return asText(todo);
  }
);

server.registerTool(
  "delete_todo",
  {
    title: "Delete todo",
    description: "Permanently delete a todo item.",
    inputSchema: { id: z.number().int() },
  },
  async ({ id }) => {
    const deleted = todos.deleteTodo(id);
    return asText({ deleted });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
