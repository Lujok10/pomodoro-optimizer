export type Provider = "google" | "outlook" | "todoist" | "trello" | "asana";

export type ExternalTask = {
  id: string;
  title: string;
  project?: string;
  durationMin?: number;       // if provider has estimate; else undefined
  impactHint?: number;        // 1-5 heuristic if any
  updatedAt?: string;         // ISO
  raw?: any;
};

export type Task = {
  id: number;
  name: string;
  impact: number;             // 1–5
  duration: number;           // minutes
  project?: string;
};

export type TokenRecord = {
  access_token: string;
  refresh_token?: string;
  expires_at?: string; // ISO
  scope?: string;
};
