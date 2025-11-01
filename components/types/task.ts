// Canonical Task + TaskStatus used across the app

export type TaskStatus = "planned" | "active" | "completed" | "pending";

export type Task = {
  id: number;
  name: string;
  impact: 1 | 2 | 3;
  duration: number;        // minutes
  project?: string;

  // runtime / optional fields used by UI & libs
  score?: number;
  status?: TaskStatus;
  remaining?: number;
  timeSpent?: number;
  isRunning?: boolean;
  completed?: boolean;
  feedback?: "yes" | "no";
};
