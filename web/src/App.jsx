import { useEffect, useState, useCallback } from "react";
import "./App.css";

const API_BASE = "/api/todos";

function toDateInputValue(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function NewTodoRow({ onAdd }) {
  const [description, setDescription] = useState("");
  const [datePlanned, setDatePlanned] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    await onAdd({ description: description.trim(), date_planned: datePlanned || null });
    setDescription("");
    setDatePlanned("");
  };

  return (
    <form className="new-todo" onSubmit={submit}>
      <input
        type="text"
        placeholder="Add a new todo..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="date"
        value={datePlanned}
        onChange={(e) => setDatePlanned(e.target.value)}
        title="Planned date"
      />
      <button type="submit">Add</button>
    </form>
  );
}

function TodoRow({ todo, onUpdate, onDelete }) {
  const [description, setDescription] = useState(todo.description);
  const [datePlanned, setDatePlanned] = useState(toDateInputValue(todo.date_planned));
  const [doneBy, setDoneBy] = useState(todo.done_by || "");

  useEffect(() => setDescription(todo.description), [todo.description]);
  useEffect(() => setDatePlanned(toDateInputValue(todo.date_planned)), [todo.date_planned]);
  useEffect(() => setDoneBy(todo.done_by || ""), [todo.done_by]);

  const commitDescription = () => {
    if (description.trim() && description !== todo.description) {
      onUpdate(todo.id, { description: description.trim() });
    }
  };

  const commitDatePlanned = (value) => {
    setDatePlanned(value);
    onUpdate(todo.id, { date_planned: value || null });
  };

  const commitDoneBy = () => {
    if (doneBy !== (todo.done_by || "")) {
      onUpdate(todo.id, { done_by: doneBy || null });
    }
  };

  const toggleDone = (checked) => {
    onUpdate(todo.id, {
      done: checked,
      done_by: checked ? doneBy || "user" : null,
    });
  };

  return (
    <>
      <tr className={todo.done ? "done" : ""}>
        <td className="col-done">
          <input
            type="checkbox"
            checked={todo.done}
            onChange={(e) => toggleDone(e.target.checked)}
          />
        </td>
        <td className="col-date">{formatDateTime(todo.date_created)}</td>
        <td className="col-date">
          <input
            type="date"
            value={datePlanned}
            onChange={(e) => commitDatePlanned(e.target.value)}
          />
        </td>
        <td className="col-date">{formatDateTime(todo.date_done)}</td>
        <td className="col-doneby">
          <input
            type="text"
            placeholder="who?"
            value={doneBy}
            onChange={(e) => setDoneBy(e.target.value)}
            onBlur={commitDoneBy}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </td>
        <td className="col-actions">
          <button type="button" className="delete" onClick={() => onDelete(todo.id)}>
            ✕
          </button>
        </td>
      </tr>
      <tr className={todo.done ? "done description-row" : "description-row"}>
        <td className="col-description" colSpan={5}>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </td>
      </tr>
    </>
  );
}

function App() {
  const [todos, setTodos] = useState([]);
  const [status, setStatus] = useState("all");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}?status=${status}`);
      if (!res.ok) throw new Error(`Failed to load todos (${res.status})`);
      setTodos(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [status]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const addTodo = async (payload) => {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to add todo");
      return;
    }
    load();
  };

  const updateTodo = async (id, fields) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      setError("Failed to update todo");
    }
    load();
  };

  const deleteTodo = async (id) => {
    if (!window.confirm("Delete this todo?")) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) setError("Failed to delete todo");
  };

  return (
    <div className="app">
      <h1>Todo List</h1>

      <div className="toolbar">
        <div className="filters">
          {["all", "open", "done"].map((s) => (
            <button
              key={s}
              className={s === status ? "active" : ""}
              onClick={() => setStatus(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <NewTodoRow onAdd={addTodo} />
      </div>

      {error && <div className="error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Done</th>
            <th>Created</th>
            <th>Planned</th>
            <th>Completed</th>
            <th>Done by</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {todos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onUpdate={updateTodo} onDelete={deleteTodo} />
          ))}
          {todos.length === 0 && (
            <tr>
              <td colSpan={6} className="empty">
                No todos here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
