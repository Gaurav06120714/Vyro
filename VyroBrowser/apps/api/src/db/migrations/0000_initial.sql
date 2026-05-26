-- Vyro Browser initial schema
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  instruction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  plan TEXT,
  result TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_id TEXT,
  file_path TEXT NOT NULL,
  url TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_steps_task_id ON steps(task_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_task_id ON screenshots(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
