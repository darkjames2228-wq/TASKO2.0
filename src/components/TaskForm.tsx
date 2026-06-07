import React, { useState } from "react";
import { Category, Priority, Task } from "../types";
import { Plus, Clock, Tag, Zap } from "lucide-react";

interface TaskFormProps {
  onAddTask: (text: string, category: Category, priority: Priority, due: string | null) => Promise<void>;
  isSubmitting: boolean;
}

export function TaskForm({ onAddTask, isSubmitting }: TaskFormProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>(Category.GENERAL);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [due, setDue] = useState<string>("");
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    await onAddTask(text, category, priority, due ? due : null);
    
    // Reset fields
    setText("");
    setDue("");
    setShowOptions(false);
  };

  return (
    <form id="task-addition-form" onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mb-6">
      <div className="bg-brand-dark-surface/80 border border-brand-border backdrop-blur-md rounded-2xl p-4 shadow-md">
        {/* Main Row */}
        <div className="flex gap-2.5 items-stretch">
          <input
            id="task-title-input"
            type="text"
            className="flex-1 bg-brand-dark/95 border border-brand-border focus:border-brand-neon focus:ring-1 focus:ring-brand-neon/20 rounded-xl px-4 py-3.5 text-sm md:text-base text-gray-100 placeholder-brand-muted outline-none transition-all duration-200"
            placeholder="Add new task... or toggle parameters below"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            required
            autoComplete="off"
          />
          <button
            id="task-submit-button"
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="bg-brand-neon hover:bg-[#ebff5c] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-brand-dark font-display font-bold px-5 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 shadow-md shadow-brand-neon/10"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Add Task</span>
              </>
            )}
          </button>
        </div>

        {/* Toggle Metadata Controls Expand Button */}
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
          <button
            type="button"
            id="expand-meta-btn"
            onClick={() => setShowOptions(!showOptions)}
            className="text-xs font-mono font-medium text-brand-cyan hover:text-brand-cyan/80 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="text-[10px]">{showOptions ? "▼" : "▶"}</span>
            {showOptions ? "Hide Parameters" : "Edit Parameters... (Category, Priority, Date)"}
          </button>

          {/* Quick categories label info */}
          {!showOptions && (
            <div className="flex gap-1.5 text-[10px] font-mono text-brand-muted">
              <span>Default:</span>
              <span className="text-brand-cyan">📋 General</span>
              <span>•</span>
              <span className="text-yellow-400">⚡ Medium</span>
            </div>
          )}
        </div>

        {/* Foldout Panel: Metadata Settings */}
        {showOptions && (
          <div id="meta-settings-foldout" className="mt-4 pt-4 border-t border-brand-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 transition-all duration-300">
            {/* Category */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-brand-muted mb-1.5 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Category
              </label>
              <select
                value={category}
                id="category-dropdown-selection"
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-brand-dark border border-brand-border hover:border-brand-cyan/50 focus:border-brand-cyan text-xs font-mono rounded-lg p-2.5 text-gray-200 outline-none cursor-pointer transition-colors"
              >
                <option value={Category.GENERAL}>📋 General</option>
                <option value={Category.WORK}>💼 Work</option>
                <option value={Category.PERSONAL}>🏠 Personal</option>
                <option value={Category.HEALTH}>💪 Health</option>
                <option value={Category.SHOPPING}>🛒 Shopping</option>
                <option value={Category.LEARNING}>📚 Learning</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-brand-muted mb-1.5 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Priority Level
              </label>
              <select
                value={priority}
                id="priority-dropdown-selection"
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-brand-dark border border-brand-border hover:border-brand-neon/50 focus:border-brand-neon text-xs font-mono rounded-lg p-2.5 text-gray-200 outline-none cursor-pointer transition-colors"
              >
                <option value={Priority.LOW}>🔵 Low Priority</option>
                <option value={Priority.MEDIUM}>🟡 Medium Priority</option>
                <option value={Priority.HIGH}>🔴 High Priority</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-brand-muted mb-1.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Due Date (Optional)
              </label>
              <input
                type="date"
                value={due}
                id="due-date-optional-selector"
                onChange={(e) => setDue(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border hover:border-brand-cyan/50 focus:border-brand-cyan text-xs font-mono rounded-lg p-2.5 text-gray-200 outline-none transition-colors color-scheme-dark"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
