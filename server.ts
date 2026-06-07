import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Category, Priority, Task } from "./src/types";
import { GoogleGenAI, Type } from "@google/genai";

// Setup server & database paths
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_PATH = path.join(process.cwd(), "tasks.json");
const USERS_PATH = path.join(process.cwd(), "users.json");

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

app.use(express.json());

// Initialize flat file tasks database if missing or corrupted
function readDatabase(): Task[] {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const seed: Task[] = [];
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

// User accounts reading and writing helper
interface DBUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
}

function readUsers(): DBUser[] {
  try {
    if (!fs.existsSync(USERS_PATH)) {
      fs.writeFileSync(USERS_PATH, JSON.stringify([], null, 2), "utf8");
      return [];
    }
    const raw = fs.readFileSync(USERS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error("Users database reading error:", e);
    return [];
  }
}

function writeUsers(users: DBUser[]): void {
  try {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
  } catch (e) {
    console.error("Users database writing error:", e);
  }
}

// Simple Helper to extract user identity from Bearer Authorization header
function getRequestUser(req: express.Request): { userId: string; username: string } | null {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7); // format "userId:username"
      const parts = token.split(":");
      if (parts.length >= 2) {
        return { userId: parts[0], username: parts[1] };
      }
    } catch {
      return null;
    }
  }
  return null;
}

// ─── AUTHENTICATION API ENDPOINTS ──────────────────────────────────────────

// POST API: Register account
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || typeof username !== "string" || username.trim() === "") {
      res.status(400).json({ error: "Username is required" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters" });
      return;
    }

    const trimmedUsername = username.trim();
    const users = readUsers();

    const exists = users.some(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (exists) {
      res.status(400).json({ error: "Username already exists" });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.createHmac("sha256", salt).update(password).digest("hex");

    const newUser: DBUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      username: trimmedUsername,
      passwordHash,
      salt,
    };

    users.push(newUser);
    writeUsers(users);

    const token = `${newUser.id}:${newUser.username}`;
    res.status(201).json({
      message: "Account registered successfully",
      user: { id: newUser.id, username: newUser.username },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to register account" });
  }
});

// POST API: Login account
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const trimmedUsername = username.trim();
    const users = readUsers();

    const user = users.find(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const checkHash = crypto.createHmac("sha256", user.salt).update(password).digest("hex");
    if (checkHash !== user.passwordHash) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = `${user.id}:${user.username}`;
    res.json({
      message: "Access granted",
      user: { id: user.id, username: user.username },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to login" });
  }
});

// POST API: Migrate temporary workspace items to account
app.post("/api/tasks/migrate", (req, res) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: "Authorization required for task migration" });
      return;
    }

    const { localTasks } = req.body;
    if (!Array.isArray(localTasks)) {
      res.status(400).json({ error: "localTasks array is required" });
      return;
    }

    const tasks = readDatabase();
    let migratedCount = 0;

    localTasks.forEach((lt: any) => {
      // Avoid duplicate migration if a task by search description already exists
      const isDuplicate = tasks.some(
        (t) => t.userId === user.userId && t.text.toLowerCase() === lt.text.trim().toLowerCase()
      );
      if (!isDuplicate && lt.text?.trim()) {
        tasks.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          userId: user.userId,
          text: lt.text.trim(),
          done: !!lt.done,
          category: lt.category || Category.GENERAL,
          priority: lt.priority || Priority.MEDIUM,
          due: lt.due || null,
          created: lt.created || Date.now(),
          order: lt.order || 0,
        });
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      writeDatabase(tasks);
    }

    res.json({ success: true, migratedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Migration process failed" });
  }
});

// ─── TASK RESOURCE API ENDPOINTS ──────────────────────────────────────────

// GET API: Retrieve user's tasks
app.get("/api/tasks", (req, res) => {
  const user = getRequestUser(req);
  const tasks = readDatabase();

  // Tasks are filtered by specific user, or shown to anonymous sessions when unauthenticated
  const filtered = user
    ? tasks.filter((t) => t.userId === user.userId)
    : tasks.filter((t) => !t.userId);

  filtered.sort((a, b) => a.order - b.order);
  res.json(filtered);
});

// POST API: Create a new task
app.post("/api/tasks", (req, res) => {
  try {
    const { text, category, priority, due } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      res.status(400).json({ error: "Task text description is required" });
      return;
    }

    const user = getRequestUser(req);
    const tasks = readDatabase();

    const userTasks = user
      ? tasks.filter((t) => t.userId === user.userId)
      : tasks.filter((t) => !t.userId);

    const minOrder = userTasks.length > 0 ? Math.min(...userTasks.map((t) => t.order)) : 0;
    const orderIndex = minOrder - 1000;

    const newTask: Task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      userId: user?.userId,
      text: text.trim(),
      done: false,
      category: (category as Category) || Category.GENERAL,
      priority: (priority as Priority) || Priority.MEDIUM,
      due: due || null,
      created: Date.now(),
      order: orderIndex,
    };

    tasks.push(newTask);
    writeDatabase(tasks);

    res.status(201).json(newTask);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to create task" });
  }
});

// PUT API: Update an existing task's attributes
app.put("/api/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { text, done, category, priority, due } = req.body;

    const user = getRequestUser(req);
    const tasks = readDatabase();
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      res.status(404).json({ error: "Suggested task does not exist" });
      return;
    }

    const currentTask = tasks[taskIndex];

    // Ownership authorization validation guards
    if (user) {
      if (currentTask.userId !== user.userId) {
        res.status(403).json({ error: "Access Denied: unauthorized target" });
        return;
      }
    } else {
      if (currentTask.userId) {
        res.status(403).json({ error: "Access Denied: authentication required for resource" });
        return;
      }
    }

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
    const user = getRequestUser(req);
    let tasks = readDatabase();
    const task = tasks.find((t) => t.id === id);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (user) {
      if (task.userId !== user.userId) {
        res.status(403).json({ error: "Access Denied: unauthorized target" });
        return;
      }
    } else {
      if (task.userId) {
        res.status(403).json({ error: "Access Denied" });
        return;
      }
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

    const user = getRequestUser(req);
    const tasks = readDatabase();

    // Verify all targets belong to caller
    for (const id of orderedIds) {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        if (user && task.userId !== user.userId) {
          res.status(403).json({ error: "Access Denied" });
          return;
        } else if (!user && task.userId) {
          res.status(403).json({ error: "Access Denied" });
          return;
        }
      }
    }

    orderedIds.forEach((id, idx) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        task.order = idx * 10;
      }
    });

    tasks.sort((a, b) => a.order - b.order);
    writeDatabase(tasks);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to reorder tasks" });
  }
});

// POST API: Clear completed tasks
app.post("/api/tasks/clear-completed", (req, res) => {
  try {
    const user = getRequestUser(req);
    let tasks = readDatabase();
    const beforeCount = tasks.length;

    if (user) {
      tasks = tasks.filter((t) => !(t.userId === user.userId && t.done));
    } else {
      tasks = tasks.filter((t) => !(!t.userId && t.done));
    }

    writeDatabase(tasks);
    res.json({ success: true, clearedCount: beforeCount - tasks.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to clear completed tasks" });
  }
});

// POST API: Seed demo tasks
app.post("/api/tasks/seed-demo", (req, res) => {
  try {
    const user = getRequestUser(req);

    const demoTasks: Task[] = [
      {
        id: "demo-t1-" + Date.now().toString(36),
        userId: user?.userId,
        text: "🔧 Design dynamic theme switcher supporting Volt, Aether, and Cyber Punk presets",
        done: true,
        category: Category.WORK,
        priority: Priority.HIGH,
        due: new Date().toISOString().split("T")[0],
        created: Date.now() - 4 * 3600000,
        order: 0,
      },
      {
        id: "demo-t2-" + Date.now().toString(36),
        userId: user?.userId,
        text: "🚀 Set up automated continuous deployment hooks configured for Railway.app",
        done: false,
        category: Category.WORK,
        priority: Priority.HIGH,
        due: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        created: Date.now() - 3 * 3600000,
        order: 10,
      },
      {
        id: "demo-t3-" + Date.now().toString(36),
        userId: user?.userId,
        text: "📚 Investigate multi-stage Docker compilations & Node ESM resolution rules",
        done: false,
        category: Category.LEARNING,
        priority: Priority.MEDIUM,
        due: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        created: Date.now() - 2 * 3600000,
        order: 20,
      },
      {
        id: "demo-t4-" + Date.now().toString(36),
        userId: user?.userId,
        text: "💪 Complete standard 12-minute back strengthening & deep stretching cycles",
        done: false,
        category: Category.HEALTH,
        priority: Priority.LOW,
        due: new Date().toISOString().split("T")[0],
        created: Date.now() - 1800000,
        order: 30,
      }
    ];

    let tasks = readDatabase();
    if (user) {
      tasks = tasks.filter((t) => t.userId !== user.userId);
    } else {
      tasks = tasks.filter((t) => !(!t.userId)); // clear original anonymous
    }

    tasks.push(...demoTasks);
    writeDatabase(tasks);

    res.json({ success: true, count: demoTasks.length, tasks: demoTasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to seed demo" });
  }
});

// POST API: Wipe out user database records
app.post("/api/tasks/clear-all", (req, res) => {
  try {
    const user = getRequestUser(req);
    let tasks = readDatabase();

    if (user) {
      tasks = tasks.filter((t) => t.userId !== user.userId);
    } else {
      tasks = tasks.filter((t) => !!t.userId);
    }

    writeDatabase(tasks);
    res.json({ success: true, count: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to wipe records" });
  }
});

// POST API: Auto-categorize tasks using Gemini
app.post("/api/tasks/categorize", async (req, res) => {
  try {
    if (!ai) {
      res.status(503).json({ error: "AI capability not configured on the server." });
      return;
    }

    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      res.status(400).json({ error: "Task text description is required" });
      return;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze the following task text and suggest the best category and priority for it.
Task text: "${text}"

Available Categories: WORK, PERSONAL, LEARNING, HEALTH, HOME, GENERAL
Available Priorities: LOW, MEDIUM, HIGH`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Suggested category" },
            priority: { type: Type.STRING, description: "Suggested priority" }
          },
          required: ["category", "priority"]
        }
      }
    });

    if (response && response.text) {
      const result = JSON.parse(response.text.trim());
      res.json(result);
    } else {
      res.status(500).json({ error: "Failed to parse AI response" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to categorize task" });
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
