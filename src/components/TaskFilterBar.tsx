import React from "react";
import { Search, Trash2 } from "lucide-react";

export type FilterType = "all" | "active" | "done" | "high" | "today";

interface TaskFilterBarProps {
  currentFilter: FilterType;
  onChangeFilter: (filter: FilterType) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  onClearCompleted: () => Promise<void>;
  hasCompleted: boolean;
}

export function TaskFilterBar({
  currentFilter,
  onChangeFilter,
  searchQuery,
  onChangeSearch,
  onClearCompleted,
  hasCompleted,
}: TaskFilterBarProps) {
  const filterTabs: { key: FilterType; label: string; icon?: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "done", label: "Done" },
    { key: "high", label: "🔴 High" },
    { key: "today", label: "📅 Today" },
  ];

  return (
    <div id="filter-search-sorting-bar" className="w-full max-w-2xl mx-auto mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      {/* Scrollable / Wrap Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {filterTabs.map((tab) => {
          const isActive = currentFilter === tab.key;
          return (
            <button
              key={tab.key}
              id={`filter-tab-${tab.key}`}
              onClick={() => onChangeFilter(tab.key)}
              className={`text-xs font-mono px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                isActive
                  ? "bg-brand-neon border-brand-neon text-brand-dark font-semibold shadow-md shadow-brand-neon/15"
                  : "bg-brand-dark-surface/90 border-brand-border text-brand-muted hover:border-brand-neon/40 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input & Delete Completed Action row */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 sm:w-48 sm:flex-initial">
          <input
            type="text"
            id="search-tasks-field"
            placeholder="🔍 Search tasks..."
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="w-full bg-brand-dark-surface/90 border border-brand-border focus:border-brand-cyan/60 rounded-full py-1.5 pl-8 pr-3.5 text-xs font-mono text-gray-200 placeholder-brand-muted outline-none transition-all duration-200"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-muted" />
        </div>

        {/* Clear Completed Action */}
        {hasCompleted && (
          <button
            onClick={onClearCompleted}
            id="clear-completed-button"
            className="bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-full px-3 py-1.5 text-xs font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
            title="Clear Completed Tasks"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden md:inline">Purge Done</span>
          </button>
        )}
      </div>
    </div>
  );
}
