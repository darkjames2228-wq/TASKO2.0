import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Category, Priority, Task } from "./src/types";

// Setup server & database paths
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_PATH = path.join(process.cwd(), "tasks.json");

app.use(express.json());

// Initialize flat file DB if missing or corrupted
function readDatabase(): Task[] {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const seed: Task[] = [
        {
          id: "seed-1",
          text: "🚀 Configure Tasko server deployment pipeline on Railway.app",
          done: false,
          category: Category.WORK,
          priority: Priority.HIGH,
          due: new Date().toISOString().split("T")[0],
          created: Date.now() - 3600000,
          order: 0,
        },
        {
          id: "seed-2",
          text: "📚 Read advanced TypeScript modules, enums, & compiler rules",
          done: false,
          category: Category.LEARNING,
          priority: Priority.MEDIUM,
          due: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          created: Date.now() - 1800000,
          order: 10,
        },
        {
          id: "seed-3",
          text: "🏠 Dedicate 15 minutes of quiet time to mental sync & breathing flow",
          done: true,
          category: Category.PERSONAL,
          priority: Priority.LOW,
          due: new Date().toISOString().split("T")[0],
          created: Date.now() - 900000,
          order: 20,
        }
      ];
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
      return seed;
    }
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Database reading error, resetting database stores:", error);
    return [];
  }
}

function writeDatabase(tasks: Task[]): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(tasks, null, 2), "utf8");
  } catch (error) {
    console.error("Database writing error:", error);
  }
}

// ─── API ROUTE HANDLERS ──────────────────────────────────────────

// GET API: Retrieve all tasks
app.get("/api/tasks", (req, res) => {
  const tasks = readDatabase();
  // Sort tasks by `order` ascending
  tasks.sort((a, b) => a.order - b.order);
  res.json(tasks);
});

// POST API: Create a new task
app.post("/api/tasks", (req, res) => {
  try {
    const { text, category, priority, due } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      res.status(400).json({ error: "Task text description is required" });
      return;
    }

    const tasks = readDatabase();
    
    // Calculate smallest order index to prepend at top, or append
    const minOrder = tasks.length > 0 ? Math.min(...tasks.map(t => t.order)) : 0;
    const orderIndex = minOrder - 1000; // prepend at the very beginning of standard list

    const newTask: Task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      text: text.trim(),
      done: false,
      category: (category as Category) || Category.GENERAL,
      priority: (priority as Priority) || Priority.MEDIUM,
      due: due || null,
      created: Date.now(),
      order: orderIndex,
    };

    tasks.push(newTask);
    tasks.sort((a, b) => a.order - b.order);
    writeDatabase(tasks);

    res.status(201).json(newTask);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to create task" });
  }
});

// PUT API: Update an existing task's status / attributes
app.put("/api/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { text, done, category, priority, due } = req.body;

    const tasks = readDatabase();
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      res.status(404).json({ error: "Suggested task does not exist" });
      return;
    }

    const currentTask = tasks[taskIndex];
    
    if (text !== undefined) currentTask.text = String(text).trim();
    if (done !== undefined) currentTask.done = Boolean(done);
    if (category !== undefined) currentTask.category = category as Category;
    if (priority !== undefined) currentTask.priority = priority as Priority;
    if (due !== undefined) currentTask.due = due || null;

    writeDatabase(tasks);
    res.json(currentTask);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update task" });
  }
});

// DELETE API: Delete a task
app.delete("/api/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    let tasks = readDatabase();
    const exists = tasks.some((t) => t.id === id);

    if (!exists) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    tasks = tasks.filter((t) => t.id !== id);
    writeDatabase(tasks);
    res.json({ success: true, removedId: id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to delete task" });
  }
});

// POST API: Reorder tasks via Drag-and-Drop
app.post("/api/tasks/reorder", (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: "orderedIds array of IDs is required" });
      return;
    }

    const tasks = readDatabase();
    
    // Direct remapping of ordered arrays
    orderedIds.forEach((id, idx) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        task.order = idx * 10; // spaced out index
      }
    });

    tasks.sort((a, b) => a.order - b.order);
    writeDatabase(tasks);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to reorder tasks" });
  }
});

// POST API: Clear all completed tasks
app.post("/api/tasks/clear-completed", (req, res) => {
  try {
    let tasks = readDatabase();
    const previousCount = tasks.length;
    tasks = tasks.filter((t) => !t.done);
    writeDatabase(tasks);
    res.json({ success: true, clearedCount: previousCount - tasks.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to clear completed tasks" });
  }
});

// POST API: Seed a real-life development & workspace demo kit
app.post("/api/tasks/seed-demo", (req, res) => {
  try {
    const demoTasks: Task[] = [
      {
        id: "demo-t1",
        text: "🔧 Design dynamic theme switcher supporting Volt, Aether, and Cyber Punk presets",
        done: true,
        category: Category.WORK,
        priority: Priority.HIGH,
        due: new Date().toISOString().split("T")[0],
        created: Date.now() - 4 * 3600000,
        order: 0,
      },
      {
        id: "demo-t2",
        text: "🚀 Set up automated continuous deployment hooks configured for Railway.app",
        done: false,
        category: Category.WORK,
        priority: Priority.HIGH,
        due: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        created: Date.now() - 3 * 3600000,
        order: 10,
      },
      {
        id: "demo-t3",
        text: "📚 Investigate multi-stage Docker compilations & Node ESM resolution rules",
        done: false,
        category: Category.LEARNING,
        priority: Priority.MEDIUM,
        due: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        created: Date.now() - 2 * 3600000,
        order: 20,
      },
      {
        id: "demo-t4",
        text: "💪 Complete standard 12-minute back strengthening & deep stretching cycles",
        done: false,
        category: Category.HEALTH,
        priority: Priority.LOW,
        due: new Date().toISOString().split("T")[0],
        created: Date.now() - 1800000,
        order: 30,
      }
    ];

    writeDatabase(demoTasks);
    res.json({ success: true, count: demoTasks.length, tasks: demoTasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to seed demo workspace" });
  }
});

// POST API: Wipe out all existing database records (Clean Slate)
app.post("/api/tasks/clear-all", (req, res) => {
  try {
    writeDatabase([]);
    res.json({ success: true, count: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to clear database store" });
  }
});

// ─── CONNECT FRONTEND MIDDLEWARES ─────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEV mode. Mounting Vite handler.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode. Serving prebuilt assets.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tasko backend fully available at: http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Vite/Express backend startup failed:", err);
});
