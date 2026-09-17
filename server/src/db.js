import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.TODO_DB_PATH || path.join(__dirname, "..", "todo.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    date_created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    date_planned TEXT,
    date_done TEXT,
    done_by TEXT,
    created_by TEXT,
    resolution TEXT
  );
`);

const existingColumns = db.prepare("PRAGMA table_info(todos)").all().map((c) => c.name);
if (!existingColumns.includes("resolution")) {
  db.exec("ALTER TABLE todos ADD COLUMN resolution TEXT");
}

function rowToTodo(row) {
  if (!row) return row;
  return { ...row, done: !!row.done };
}

export function listTodos({ status = "all" } = {}) {
  let where = "";
  if (status === "open") where = "WHERE done = 0";
  else if (status === "done") where = "WHERE done = 1";
  const rows = db
    .prepare(`SELECT * FROM todos ${where} ORDER BY done ASC, date_planned IS NULL, date_planned ASC, id DESC`)
    .all();
  return rows.map(rowToTodo);
}

export function getTodo(id) {
  const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
  return rowToTodo(row);
}

export function addTodo({ description, date_planned = null, created_by = null }) {
  const info = db
    .prepare(
      "INSERT INTO todos (description, date_planned, created_by) VALUES (?, ?, ?)"
    )
    .run(description, date_planned, created_by);
  return getTodo(info.lastInsertRowid);
}

const UPDATABLE_FIELDS = ["description", "done", "date_planned", "date_done", "done_by", "resolution"];

export function updateTodo(id, fields) {
  const existing = getTodo(id);
  if (!existing) return null;

  const updates = { ...fields };

  // Keep date_done / done in sync when only one side is set explicitly.
  if (Object.prototype.hasOwnProperty.call(updates, "done")) {
    const done = !!updates.done;
    updates.done = done ? 1 : 0;
    if (done && !existing.date_done && !updates.date_done) {
      updates.date_done = new Date().toISOString();
    }
    if (!done && !Object.prototype.hasOwnProperty.call(updates, "date_done")) {
      updates.date_done = null;
      updates.done_by = updates.done_by ?? null;
    }
  }

  const keys = Object.keys(updates).filter((k) => UPDATABLE_FIELDS.includes(k));
  if (keys.length === 0) return existing;

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => updates[k]);
  db.prepare(`UPDATE todos SET ${setClause} WHERE id = ?`).run(...values, id);
  return getTodo(id);
}

export function completeTodo(id, done_by = null, resolution = null) {
  const updates = {
    done: 1,
    date_done: new Date().toISOString(),
    done_by,
  };
  if (resolution !== null) updates.resolution = resolution;
  return updateTodo(id, updates);
}

export function deleteTodo(id) {
  const info = db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  return info.changes > 0;
}

export default db;
