import express from "express";
import cors from "cors";
import * as todos from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/todos", (req, res) => {
  const status = req.query.status || "all";
  res.json(todos.listTodos({ status }));
});

app.get("/api/todos/:id", (req, res) => {
  const todo = todos.getTodo(Number(req.params.id));
  if (!todo) return res.status(404).json({ error: "not found" });
  res.json(todo);
});

app.post("/api/todos", (req, res) => {
  const { description, date_planned, created_by } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ error: "description is required" });
  }
  const todo = todos.addTodo({
    description: description.trim(),
    date_planned: date_planned || null,
    created_by: created_by || "user",
  });
  res.status(201).json(todo);
});

app.put("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const todo = todos.updateTodo(id, req.body);
  if (!todo) return res.status(404).json({ error: "not found" });
  res.json(todo);
});

app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const ok = todos.deleteTodo(id);
  if (!ok) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Todo REST API listening on http://localhost:${PORT}`);
});
