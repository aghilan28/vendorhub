// KARTEX M7 — Unified Workspace Model.
// A personal layer on top of the integrated intelligence platform. Browser-safe.

export type ISODate = string;

// Systems the workspace can reference (the five OSes + the intelligence spine).
export type RefSystem = "research" | "knowledge" | "simulation" | "secis" | "governance" | "intelligence";

export interface CrossRef {
  system: RefSystem;
  refId: string;
  refRoute: string;
  label: string;
}

// ── Users / roles ─────────────────────────────────────────────────────────────

export type WorkspaceRole = "lead" | "analyst" | "reviewer" | "viewer";

export interface WorkspaceUser {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export type Permission = "project.manage" | "task.manage" | "preferences.manage";

// ── 1. Workspace (the container) ──────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description: string;
}

// ── 2. Project ────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "on_hold" | "complete" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  ownerName: string;
  links: CrossRef[];
  progress: number; // 0..100
  tags: string[];
  dueDate?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── 3. Task / 7. Assignment ───────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  assigneeId: string;
  assigneeName: string;
  status: TaskStatus;
  priority: Priority;
  system?: RefSystem;
  route?: string;
  dueDate?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── 6. Notification ───────────────────────────────────────────────────────────

export type NotificationKind = "event" | "approval" | "review" | "failure" | "recommendation" | "insight";

export interface Notification {
  id: string;
  system: RefSystem;
  kind: NotificationKind;
  title: string;
  detail: string;
  route?: string;
  read: boolean;
  createdAt: ISODate;
}

// ── 11/12. Bookmarks & Favorites ──────────────────────────────────────────────

export interface Bookmark {
  id: string;
  label: string;
  route: string;
  system: RefSystem;
  note?: string;
  createdAt: ISODate;
}

export interface Favorite {
  id: string;
  label: string;
  route: string;
  createdAt: ISODate;
}

// ── Saved searches / preferences (personalization) ───────────────────────────

export interface SavedSearch {
  id: string;
  label: string;
  query: string;
  system: string; // "all" or RefSystem
  createdAt: ISODate;
}

export interface Preferences {
  defaultLanding: "workspace" | "intelligence";
  density: "comfortable" | "compact";
  showSystemHealth: boolean;
  pinnedSystems: RefSystem[];
}

// ── Derived (not persisted) ───────────────────────────────────────────────────

// 5. Action — anything awaiting the user.
export type ActionKind = "review" | "approval" | "simulation" | "decision" | "governance" | "task";

export interface ActionItem {
  id: string;
  kind: ActionKind;
  system: RefSystem;
  title: string;
  detail: string;
  route: string;
  priority: Priority;
}

// Intelligence Inbox — unified signals.
export type InboxKind = "insight" | "recommendation" | "warning" | "risk" | "approval" | "exception" | "task";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  system: RefSystem;
  title: string;
  detail: string;
  route: string;
  at: ISODate;
}

// Activity — recent cross-system actions.
export interface ActivityItem {
  id: string;
  system: RefSystem;
  summary: string;
  actor: string;
  at: ISODate;
}

// Product analytics.
export interface ProductAnalytics {
  projects: number;
  activeProjects: number;
  tasks: number;
  taskCompletion: number; // %
  openTasks: number;
  workflowCompletion: number; // %
  approvalVelocity: number; // % decisions resolved
  simulationUsage: number;
  researchUsage: number;
  knowledgeUsage: number;
  governanceUsage: number;
  notifications: number;
  unread: number;
  usageByStage: Array<{ label: string; value: number }>;
}
