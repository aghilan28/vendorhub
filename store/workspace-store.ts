"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid, type Bookmark, type CrossRef, type Favorite, type Notification, type NotificationKind, type Preferences, type Priority, type Project, type RefSystem, type SavedSearch, type Task, type TaskStatus, type WorkspaceUser } from "@/lib/workspace";

function now(): string {
  return new Date().toISOString();
}
const SEED_BASE = Date.parse("2026-05-26T09:00:00.000Z");
function seedTime(min: number): string {
  return new Date(SEED_BASE + min * 60_000).toISOString();
}

const SEED_USERS: WorkspaceUser[] = [
  { id: "ws_anita", name: "Anita Desai", role: "lead" },
  { id: "ws_rahul", name: "Rahul Menon", role: "analyst" },
  { id: "ws_leela", name: "Leela Nair", role: "reviewer" },
  { id: "ws_sam", name: "Sam Iyer", role: "viewer" },
];

function ref(system: RefSystem, refId: string, refRoute: string, label: string): CrossRef {
  return { system, refId, refRoute, label };
}

const SEED_PROJECTS: Project[] = [
  {
    id: "prj-pricing",
    name: "Festive Pricing Initiative",
    description: "From elasticity research to a governed festive price experiment.",
    status: "complete",
    ownerId: "ws_rahul",
    ownerName: "Rahul Menon",
    links: [
      ref("intelligence", "wf-pricing", "/intelligence/lineage?workflow=wf-pricing", "Festive Pricing workflow"),
      ref("simulation", "sim_pricing", "/simulations/sim_pricing", "Festive Pricing Strategy"),
      ref("governance", "dec-pricing", "/governance/decisions/dec-pricing", "Adopt optimised festive price"),
    ],
    progress: 100,
    tags: ["pricing", "festive"],
    createdAt: seedTime(0),
    updatedAt: seedTime(60),
  },
  {
    id: "prj-dairy",
    name: "Dairy Supply Resilience",
    description: "Reduce single-supplier risk through backup-supplier and safety-stock strategy.",
    status: "active",
    ownerId: "ws_rahul",
    ownerName: "Rahul Menon",
    links: [
      ref("intelligence", "wf-dairy", "/intelligence/lineage?workflow=wf-dairy", "Dairy Resilience workflow"),
      ref("secis", "ce-supplier", "/secis/ce-supplier", "Anand Dairy supply outage"),
      ref("governance", "dec-backup", "/governance/decisions/dec-backup", "Activate backup supplier"),
    ],
    progress: 80,
    tags: ["supply", "resilience"],
    createdAt: seedTime(100),
    updatedAt: seedTime(180),
  },
  {
    id: "prj-launch",
    name: "Q3 Launch Readiness",
    description: "Hyperlocal vendor onboarding launch, from research to a governed plan.",
    status: "active",
    ownerId: "ws_anita",
    ownerName: "Anita Desai",
    links: [
      ref("intelligence", "wf-launch", "/intelligence/lineage?workflow=wf-launch", "Q3 Launch workflow"),
      ref("simulation", "sim_launch", "/simulations/sim_launch", "Q3 Vendor Onboarding Launch"),
    ],
    progress: 55,
    tags: ["launch", "q3"],
    dueDate: seedTime(20000),
    createdAt: seedTime(200),
    updatedAt: seedTime(280),
  },
];

function task(id: string, title: string, description: string, projectId: string | undefined, assigneeId: string, assigneeName: string, status: TaskStatus, priority: Priority, system: RefSystem | undefined, route: string | undefined, createdMin: number, dueDays?: number): Task {
  return { id, title, description, projectId, assigneeId, assigneeName, status, priority, system, route, dueDate: dueDays ? new Date(Date.now() + dueDays * 86_400_000).toISOString() : undefined, createdAt: seedTime(createdMin), updatedAt: seedTime(createdMin) };
}

const SEED_TASKS: Task[] = [
  task("tsk-1", "Review demand-forecast model decision", "Decision dec-model is awaiting review before publication.", "prj-launch", "ws_anita", "Anita Desai", "todo", "high", "governance", "/governance/decisions/dec-model", 210, 2),
  task("tsk-2", "Analyse launch demand-surge impact", "Run a SECIS demand-surge analysis for the Q3 launch.", "prj-launch", "ws_anita", "Anita Desai", "in_progress", "high", "secis", "/secis/change-events?type=demand_surge", 220, 5),
  task("tsk-3", "Run supply disruption simulation", "Model the dairy supply disruption in the Simulation OS.", "prj-dairy", "ws_anita", "Anita Desai", "todo", "medium", "simulation", "/simulations", 160, 4),
  task("tsk-4", "Publish vendor onboarding playbook", "Codify onboarding research into a knowledge asset.", "prj-launch", "ws_rahul", "Rahul Menon", "done", "medium", "knowledge", "/intelligence/workflows", 215),
  task("tsk-5", "Approve festive price experiment", "Approve the festive repricing decision.", "prj-pricing", "ws_anita", "Anita Desai", "done", "high", "governance", "/governance/decisions/dec-pricing", 55),
  task("tsk-6", "Document dairy mitigation outcome", "Capture the realised outcome of the backup-supplier mitigation.", "prj-dairy", "ws_anita", "Anita Desai", "todo", "low", "governance", "/governance/decisions/dec-backup", 185, 7),
];

function notif(id: string, system: RefSystem, kind: NotificationKind, title: string, detail: string, route: string, read: boolean, min: number): Notification {
  return { id, system, kind, title, detail, route, read, createdAt: seedTime(min) };
}

const SEED_NOTIFICATIONS: Notification[] = [
  notif("ntf-1", "governance", "approval", "Decision approved", "Adopt optimised festive price was approved.", "/governance/decisions/dec-pricing", false, 290),
  notif("ntf-2", "governance", "review", "Review requested", "Publish demand-forecast model needs a reviewer.", "/governance/decisions/dec-model", false, 285),
  notif("ntf-3", "secis", "event", "Change event analysed", "Anand Dairy supply outage propagation completed.", "/secis/ce-supplier", false, 270),
  notif("ntf-4", "simulation", "event", "Simulation completed", "Festive Pricing Strategy run finished.", "/simulations/sim_pricing", true, 250),
  notif("ntf-5", "governance", "failure", "Compliance check failed", "Vendor enforcement check is failing.", "/governance/compliance", false, 230),
  notif("ntf-6", "secis", "recommendation", "New recommendation", "Backup supplier recommended for dairy outage.", "/secis/ce-supplier", true, 200),
  notif("ntf-7", "intelligence", "event", "Workflow advanced", "Q3 Launch Readiness reached the Impact stage.", "/intelligence/workflows", false, 280),
];

const SEED_BOOKMARKS: Bookmark[] = [
  { id: "bm-1", label: "Festive Pricing Strategy", route: "/simulations/sim_pricing", system: "simulation", createdAt: seedTime(60) },
  { id: "bm-2", label: "Anand Dairy supply outage", route: "/secis/ce-supplier", system: "secis", createdAt: seedTime(170) },
  { id: "bm-3", label: "Adopt optimised festive price", route: "/governance/decisions/dec-pricing", system: "governance", createdAt: seedTime(80) },
];

const SEED_FAVORITES: Favorite[] = [
  { id: "fav-1", label: "Action Center", route: "/workspace/actions", createdAt: seedTime(10) },
  { id: "fav-2", label: "Intelligence Inbox", route: "/workspace/inbox", createdAt: seedTime(10) },
  { id: "fav-3", label: "Lineage Center", route: "/intelligence/lineage", createdAt: seedTime(10) },
];

const SEED_SEARCHES: SavedSearch[] = [
  { id: "ss-1", label: "Open governance decisions", query: "", system: "governance", createdAt: seedTime(10) },
  { id: "ss-2", label: "Pricing items", query: "pricing", system: "all", createdAt: seedTime(10) },
];

const DEFAULT_PREFERENCES: Preferences = {
  defaultLanding: "workspace",
  density: "comfortable",
  showSystemHealth: true,
  pinnedSystems: ["simulation", "governance"],
};

export interface CreateProjectInput {
  name: string;
  description: string;
  tags?: string[];
}
export interface CreateTaskInput {
  title: string;
  description: string;
  projectId?: string;
  assigneeId?: string;
  priority: Priority;
  system?: RefSystem;
  route?: string;
  dueDate?: string;
}

interface WorkspaceState {
  users: WorkspaceUser[];
  currentUserId: string;
  projects: Project[];
  tasks: Task[];
  notifications: Notification[];
  bookmarks: Bookmark[];
  favorites: Favorite[];
  savedSearches: SavedSearch[];
  preferences: Preferences;

  setCurrentUser: (id: string) => void;

  createProject: (input: CreateProjectInput) => string;
  updateProject: (id: string, patch: Partial<Pick<Project, "name" | "description" | "status" | "progress" | "tags" | "dueDate">>) => void;
  archiveProject: (id: string) => void;
  addProjectLink: (projectId: string, link: CrossRef) => void;
  removeProjectLink: (projectId: string, refId: string) => void;

  createTask: (input: CreateTaskInput) => string;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  assignTask: (id: string, userId: string) => void;
  deleteTask: (id: string) => void;

  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  addBookmark: (b: Omit<Bookmark, "id" | "createdAt">) => void;
  removeBookmark: (id: string) => void;
  addFavorite: (f: Omit<Favorite, "id" | "createdAt">) => void;
  removeFavorite: (id: string) => void;
  saveSearch: (s: Omit<SavedSearch, "id" | "createdAt">) => void;
  deleteSearch: (id: string) => void;

  updatePreferences: (patch: Partial<Preferences>) => void;
  resetToSeed: () => void;
}

function currentUser(s: WorkspaceState): WorkspaceUser {
  return s.users.find((u) => u.id === s.currentUserId) ?? s.users[0];
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      currentUserId: "ws_anita",
      projects: SEED_PROJECTS,
      tasks: SEED_TASKS,
      notifications: SEED_NOTIFICATIONS,
      bookmarks: SEED_BOOKMARKS,
      favorites: SEED_FAVORITES,
      savedSearches: SEED_SEARCHES,
      preferences: DEFAULT_PREFERENCES,

      setCurrentUser: (id) => set({ currentUserId: id }),

      createProject: (input) => {
        const id = uid("prj");
        const u = currentUser(get());
        const project: Project = { id, name: input.name, description: input.description, status: "active", ownerId: u.id, ownerName: u.name, links: [], progress: 0, tags: input.tags ?? [], createdAt: now(), updatedAt: now() };
        set((s) => ({ projects: [project, ...s.projects] }));
        return id;
      },
      updateProject: (id, patch) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)) })),
      archiveProject: (id) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, status: "archived", updatedAt: now() } : p)) })),
      addProjectLink: (projectId, link) => set((s) => ({ projects: s.projects.map((p) => (p.id === projectId && !p.links.some((l) => l.refId === link.refId) ? { ...p, links: [...p.links, link], updatedAt: now() } : p)) })),
      removeProjectLink: (projectId, refId) => set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, links: p.links.filter((l) => l.refId !== refId), updatedAt: now() } : p)) })),

      createTask: (input) => {
        const id = uid("tsk");
        const assignee = input.assigneeId ? get().users.find((u) => u.id === input.assigneeId) : currentUser(get());
        const t: Task = { id, title: input.title, description: input.description, projectId: input.projectId, assigneeId: assignee?.id ?? get().currentUserId, assigneeName: assignee?.name ?? currentUser(get()).name, status: "todo", priority: input.priority, system: input.system, route: input.route, dueDate: input.dueDate, createdAt: now(), updatedAt: now() };
        set((s) => ({ tasks: [t, ...s.tasks] }));
        return id;
      },
      setTaskStatus: (id, status) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status, updatedAt: now() } : t)) })),
      assignTask: (id, userId) => set((s) => { const u = s.users.find((x) => x.id === userId); return { tasks: s.tasks.map((t) => (t.id === id ? { ...t, assigneeId: userId, assigneeName: u?.name ?? t.assigneeName, updatedAt: now() } : t)) }; }),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      addBookmark: (b) => set((s) => (s.bookmarks.some((x) => x.route === b.route) ? {} : { bookmarks: [{ id: uid("bm"), createdAt: now(), ...b }, ...s.bookmarks] })),
      removeBookmark: (id) => set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),
      addFavorite: (f) => set((s) => (s.favorites.some((x) => x.route === f.route) ? {} : { favorites: [{ id: uid("fav"), createdAt: now(), ...f }, ...s.favorites] })),
      removeFavorite: (id) => set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),
      saveSearch: (sch) => set((s) => ({ savedSearches: [{ id: uid("ss"), createdAt: now(), ...sch }, ...s.savedSearches] })),
      deleteSearch: (id) => set((s) => ({ savedSearches: s.savedSearches.filter((x) => x.id !== id) })),

      updatePreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),

      resetToSeed: () =>
        set({ projects: SEED_PROJECTS, tasks: SEED_TASKS, notifications: SEED_NOTIFICATIONS, bookmarks: SEED_BOOKMARKS, favorites: SEED_FAVORITES, savedSearches: SEED_SEARCHES, preferences: DEFAULT_PREFERENCES }),
    }),
    { name: "vendorhub-workspace", version: 1 },
  ),
);
