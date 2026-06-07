import React, { useState, useRef } from "react";
import { Task, Category, Priority } from "../types";
import { motion } from "motion/react";
import { Check, Edit2, Trash2, Calendar, AlertTriangle, GripVertical } from "lucide-react";

interface TaskCardProps {
  key?: React.Key | string | number;
  task: Task;
  onToggle: (id: string) => Promise<void>;
  onUpdateText: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDragStart: (id: string) => void;
  onDragDrop: (draggedId: string, targetId: string) => Promise<void> | void;
}

export function TaskCard({
  task,
  onToggle,
  onUpdateText,
  onDelete,
  onDragStart,
  onDragDrop,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = task.due && task.due < todayStr && !task.done;

  // Format Due Date safely
  const formatTaskDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const [y, m, d] = dateStr.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIdx = parseInt(m, 10) - 1;
      return `${months[monthIdx] || m} ${parseInt(d, 10)}`;
    } catch {
      return dateStr;
    }
  };

  const getPriorityInfo = (pri: Priority) => {
    switch (pri) {
      case Priority.HIGH:
        return { label: "High", colorClass: "text-red-400 border-red-500/20 bg-red-400/10", borderAccent: "border-l-red-500" };
      case Priority.MEDIUM:
        return { label: "Medium", colorClass: "text-yellow-400 border-yellow-500/10 bg-yellow-400/5", borderAccent: "border-l-yellow-500" };
      case Priority.LOW:
        return { label: "Low", colorClass: "text-brand-cyan border-brand-cyan/20 bg-brand-cyan/10", borderAccent: "border-l-brand-cyan" };
    }
  };

  const getCategoryLabel = (cat: Category) => {
    const map: Record<Category, string> = {
      [Category.GENERAL]: "📋 General",
      [Category.WORK]: "💼 Work",
      [Category.PERSONAL]: "🏠 Personal",
      [Category.HEALTH]: "💪 Health",
      [Category.SHOPPING]: "🛒 Shopping",
      [Category.LEARNING]: "📚 Learning",
    };
    return map[cat] || cat;
  };

  const priInfo = getPriorityInfo(task.priority);

  // Commit text editing
  const handleCommitEdit = async () => {
    if (editText.trim() && editText.trim() !== task.text) {
      await onUpdateText(task.id, editText.trim());
    } else {
      setEditText(task.text);
    }
    setIsEditing(false);
  };

  // Keyboard controls keydown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommitEdit();
    } else if (e.key === "Escape") {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  // Drag handles
  const handleDragStartEvent = (e: React.DragEvent) => {
    onDragStart(task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // Custom drop handler pass
    const draggedId = e.dataTransfer.getData("text/plain") || "";
    onDragDrop(draggedId, task.id);
  };

  return (
    <motion.div
      layout
      id={`task-card-container-${task.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: task.done ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      draggable={!isEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        handleDragStartEvent(e);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group w-full bg-brand-dark-surface/90 border-t border-b border-r border-brand-border border-l-[3px] rounded-xl p-4 flex gap-3.5 items-start relative select-none transition-all duration-200 cursor-grab active:cursor-grabbing ${
        priInfo.borderAccent
      } ${isDragOver ? "border-brand-cyan scale-[1.01] shadow-md shadow-brand-cyan/5" : "hover:border-brand-neon/30 hover:translate-x-1"}`}
    >
      {/* Drag Indicator handle */}
      <div className="text-brand-muted/40 cursor-grab active:cursor-grabbing hover:text-brand-muted/80 self-center hidden sm:block">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Circle Custom Checkbox */}
      <button
        type="button"
        id={`checkbox-toggle-${task.id}`}
        onClick={() => onToggle(task.id)}
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5 ${
          task.done
            ? "bg-brand-neon border-brand-neon text-brand-dark"
            : "border-brand-border/80 hover:border-brand-neon"
        }`}
      >
        {task.done && <Check className="h-3.5 w-3.5 stroke-[3]" />}
      </button>

      {/* Information block */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-brand-dark border-b-2 border-brand-neon text-gray-100 font-sans text-sm font-semibold focus:outline-none py-0.5"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleCommitEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            maxLength={200}
          />
        ) : (
          <p
            id={`task-text-view-${task.id}`}
            onClick={() => {
              if (!task.done) {
                setIsEditing(true);
              }
            }}
            className={`text-sm font-semibold leading-relaxed break-words cursor-pointer ${
              task.done ? "line-through text-brand-muted" : "text-gray-100"
            }`}
          >
            {task.text}
          </p>
        )}

        {/* Metadata Badges line */}
        <div className="flex flex-wrap gap-2 items-center mt-2.5">
          {/* Category Tag */}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-brand-border bg-brand-dark-panel text-brand-muted">
            {getCategoryLabel(task.category)}
          </span>

          {/* Priority Tag */}
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${priInfo.colorClass}`}>
            {priInfo.label}
          </span>

          {/* Due Date Indicator */}
          {task.due && (
            <span
              className={`text-[10px] font-mono flex items-center gap-1 ${
                isOverdue ? "text-rose-400 font-semibold" : "text-brand-muted"
              }`}
            >
              {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {formatTaskDate(task.due)}
              {isOverdue && <span className="text-[9px] uppercase tracking-wider">(Overdue)</span>}
            </span>
          )}
        </div>
      </div>

      {/* Row action tools (Hover only on desk, visible mobile) */}
      <div className="flex gap-1.5 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => {
            if (!task.done) {
              setEditText(task.text);
              setIsEditing(!isEditing);
            }
          }}
          disabled={task.done}
          id={`edit-button-${task.id}`}
          className="p-1.5 rounded-lg bg-brand-dark-panel hover:bg-brand-border border border-brand-border text-brand-muted hover:text-brand-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Edit Inline text"
        >
          <Edit2 className="h-3 w-3" />
        </button>

        <button
          onClick={() => onDelete(task.id)}
          id={`delete-button-${task.id}`}
          className="p-1.5 rounded-lg bg-brand-dark-panel hover:bg-red-500/10 border border-brand-border hover:border-red-500/30 text-brand-muted hover:text-rose-400 transition-colors cursor-pointer"
          title="Remove task permanently"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}
