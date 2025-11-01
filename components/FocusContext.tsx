"use client";

import React, { createContext, useContext, useState } from "react";
import type { Task } from "@/components/types/task";

type FocusContextType = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  availableMinutes: number;
  setAvailableMinutes: React.Dispatch<React.SetStateAction<number>>;
  activeTask: Task | null;
  setActiveTask: React.Dispatch<React.SetStateAction<Task | null>>;
};

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [availableMinutes, setAvailableMinutes] = useState(120); // default 2h
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  return (
    <FocusContext.Provider
      value={{
        tasks,
        setTasks,
        availableMinutes,
        setAvailableMinutes,
        activeTask,
        setActiveTask,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used inside FocusProvider");
  return ctx;
}
