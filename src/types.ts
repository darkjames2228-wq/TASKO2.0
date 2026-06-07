/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum Category {
  GENERAL = "general",
  WORK = "work",
  PERSONAL = "personal",
  HEALTH = "health",
  SHOPPING = "shopping",
  LEARNING = "learning",
}

export interface Task {
  id: string;
  userId?: string;     // associated authenticated account ID
  text: string;
  done: boolean;
  category: Category;
  priority: Priority;
  due: string | null; // ISO string YYYY-MM-DD or null
  created: number;    // timestamp
  order: number;      // order index for manual drag-and-drop
}

export interface User {
  id: string;
  username: string;
}

export interface TaskStateSummary {
  total: number;
  completed: number;
  pending: number;
  highPriorityCount: number;
  overdueCount: number;
}
