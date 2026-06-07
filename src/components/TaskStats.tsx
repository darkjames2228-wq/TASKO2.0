import React from "react";
import { Task, Priority } from "../types";
import { CheckCircle2, AlertTriangle, ListTodo, Flame } from "lucide-react";

interface TaskStatsProps {
  tasks: Task[];
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const pending = total - completed;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  // Additional fine grains stats
  const highPriority = tasks.filter((t) => t.priority === Priority.HIGH && !t.done).length;
  const todayStr = new Date().toISOString().split("T")[0];
  const overdue = tasks.filter((t) => t.due && t.due < todayStr && !t.done).length;

  return (
    <div id="task-stats-panel" className="w-full max-w-2xl mx-auto mb-8 bg-brand-dark-surface/80 border border-brand-border backdrop-blur-md rounded-2xl p-5 shadow-lg">
      {/* Progress slider header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-display font-medium text-gray-300">Operational Finish Rate</span>
        <span className="text-sm font-mono font-bold text-brand-neon">{pct}%</span>
      </div>

      {/* Modern custom track progress bar */}
      <div className="w-full bg-brand-dark/95 rounded-full h-2.5 overflow-hidden border border-brand-border mb-6">
        <div 
          className="h-full bg-gradient-to-r from-brand-neon to-brand-cyan rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Grid of micro cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-brand-dark p-3.5 rounded-xl border border-brand-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase">Database Size</span>
            <ListTodo className="h-4 w-4 text-brand-cyan/70" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold text-gray-100">{total}</span>
            <span className="text-[10px] text-brand-muted font-mono">{total === 1 ? "task" : "tasks"}</span>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="bg-brand-dark p-3.5 rounded-xl border border-brand-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-brand-neon/70" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold text-gray-100">{completed}</span>
            <span className="text-[10px] text-brand-muted font-mono">cleared</span>
          </div>
        </div>

        {/* Card 3: Crucial/High Priority */}
        <div className="bg-brand-dark p-3.5 rounded-xl border border-brand-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase">Urgent</span>
            <Flame className="h-4 w-4 text-rose-500/80" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-display font-bold ${highPriority > 0 ? "text-rose-400" : "text-gray-100"}`}>
              {highPriority}
            </span>
            <span className="text-[10px] text-brand-muted font-mono">vital</span>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="bg-brand-dark p-3.5 rounded-xl border border-brand-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-1">
            <span className="text-[10px] font-mono tracking-wider uppercase">Breached Due</span>
            <AlertTriangle className="h-4 w-4 text-orange-500/80" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-display font-bold ${overdue > 0 ? "text-orange-400" : "text-gray-100"}`}>
              {overdue}
            </span>
            <span className="text-[10px] text-brand-muted font-mono">overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
