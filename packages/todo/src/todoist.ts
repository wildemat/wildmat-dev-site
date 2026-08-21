/**
 * Todoist unified API (v1) access: the sync endpoint for whole-workspace
 * snapshots (one round trip), REST-style endpoints for writes. Workers are
 * stateless, so each tool call fetches a fresh snapshot instead of
 * maintaining a local mirror. REST v2 and Sync v9 are gone (HTTP 410).
 */

const API_URL = 'https://api.todoist.com/api/v1';

export type Due = { date: string; datetime?: string; string?: string; isRecurring: boolean };

export type Task = {
  id: string;
  content: string;
  description: string;
  projectId: string;
  sectionId?: string;
  parentId?: string;
  priority: number;
  labels: string[];
  due?: Due;
  assigneeId?: string;
  completed: boolean;
  createdAt?: string;
};

export type Project = { id: string; name: string; shared: boolean };
export type Section = { id: string; name: string; projectId: string; order: number };
export type Comment = { id: string; taskId: string; content: string; postedAt?: string };
export type Label = { id: string; name: string };
export type Collaborator = { id: string; name: string; email?: string };

export type Snapshot = {
  projects: Project[];
  sections: Section[];
  tasks: Task[];
  comments: Comment[];
  labels: Label[];
  collaborators: Collaborator[];
};

// Todoist API priority is 1 (lowest) .. 4 (urgent); people say "P1" (urgent) .. "P4".
const LABEL_TO_API: Record<string, number> = { P1: 4, P2: 3, P3: 2, P4: 1 };
const API_TO_LABEL: Record<number, string> = { 4: 'P1', 3: 'P2', 2: 'P3', 1: 'P4' };

export function priorityToApi(label: string | undefined, fallback = 'P3'): number {
  const key = (label ?? fallback).trim().toUpperCase();
  return LABEL_TO_API[key] ?? LABEL_TO_API[fallback];
}

export function priorityToLabel(api: number): string {
  return API_TO_LABEL[api] ?? 'P3';
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function dueFromSync(raw: any): Due | undefined {
  if (!raw?.date) return undefined;
  const date: string = raw.date;
  return {
    date: date.split('T')[0],
    datetime: date.includes('T') ? date : undefined,
    string: raw.string ?? undefined,
    isRecurring: Boolean(raw.is_recurring),
  };
}

// Item shape is identical across the v1 sync payload and REST-style responses.
export function taskFromApi(raw: any): Task {
  return {
    id: String(raw.id),
    content: raw.content ?? '',
    description: raw.description ?? '',
    projectId: String(raw.project_id),
    sectionId: raw.section_id ? String(raw.section_id) : undefined,
    parentId: raw.parent_id ? String(raw.parent_id) : undefined,
    priority: Number(raw.priority ?? 1),
    labels: raw.labels ?? [],
    due: dueFromSync(raw.due),
    assigneeId: raw.responsible_uid ? String(raw.responsible_uid) : undefined,
    completed: Boolean(raw.checked),
    createdAt: raw.added_at ?? undefined,
  };
}

/** The surface the provider depends on — tests substitute a fake. */
export interface TodoistApi {
  snapshot(): Promise<Snapshot>;
  getTask(taskId: string): Promise<Task | undefined>;
  completedTasks(sinceDays: number): Promise<Task[]>;
  createTask(fields: Record<string, unknown>): Promise<Task>;
  updateTask(taskId: string, fields: Record<string, unknown>): Promise<Task>;
  closeTask(taskId: string): Promise<void>;
  reopenTask(taskId: string): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  addComment(taskId: string, content: string): Promise<void>;
  createProject(name: string, parentId?: string): Promise<Project>;
  createSection(projectId: string, name: string): Promise<Section>;
  createLabel(name: string): Promise<Label>;
  moveTask(taskId: string, dest: { projectId?: string; sectionId?: string }): Promise<void>;
}

export class TodoistClient implements TodoistApi {
  constructor(private token: string) {}

  private async req(method: string, url: string, body?: unknown): Promise<any> {
    const res = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`Todoist API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async snapshot(): Promise<Snapshot> {
    const data = await this.req('POST', `${API_URL}/sync`, {
      sync_token: '*',
      resource_types: ['projects', 'sections', 'items', 'labels', 'notes', 'collaborators'],
    });
    const live = (rows: any[] | undefined) =>
      (rows ?? []).filter((r) => !r.is_deleted && !r.is_archived);
    return {
      projects: live(data.projects).map((r: any) => ({
        id: String(r.id),
        name: r.name ?? '',
        shared: Boolean(r.is_shared ?? r.shared),
      })),
      sections: live(data.sections).map((r: any) => ({
        id: String(r.id),
        name: r.name ?? '',
        projectId: String(r.project_id),
        order: Number(r.section_order ?? 0),
      })),
      tasks: live(data.items).map(taskFromApi),
      comments: live(data.notes).map((r: any) => ({
        id: String(r.id),
        taskId: String(r.item_id),
        content: r.content ?? '',
        postedAt: r.posted_at ?? undefined,
      })),
      labels: live(data.labels).map((r: any) => ({ id: String(r.id), name: r.name ?? '' })),
      collaborators: (data.collaborators ?? []).map((r: any) => ({
        id: String(r.id),
        name: r.full_name ?? '',
        email: r.email ?? undefined,
      })),
    };
  }

  // The sync snapshot only carries active items, so completed tasks need
  // their own lookups for reopen / delete / comment to reach them.
  async getTask(taskId: string): Promise<Task | undefined> {
    try {
      return taskFromApi(await this.req('GET', `${API_URL}/tasks/${taskId}`));
    } catch {
      return undefined;
    }
  }

  async completedTasks(sinceDays: number): Promise<Task[]> {
    const until = new Date().toISOString().slice(0, 19);
    const since = new Date(Date.now() - sinceDays * 86400_000).toISOString().slice(0, 19);
    const query = new URLSearchParams({ since, until, limit: '100' });
    const data = await this.req(
      'GET',
      `${API_URL}/tasks/completed/by_completion_date?${query}`,
    );
    return (data?.items ?? []).map((raw: any) => ({ ...taskFromApi(raw), completed: true }));
  }

  async createTask(fields: Record<string, unknown>): Promise<Task> {
    return taskFromApi(await this.req('POST', `${API_URL}/tasks`, fields));
  }

  async updateTask(taskId: string, fields: Record<string, unknown>): Promise<Task> {
    return taskFromApi(await this.req('POST', `${API_URL}/tasks/${taskId}`, fields));
  }

  async closeTask(taskId: string): Promise<void> {
    await this.req('POST', `${API_URL}/tasks/${taskId}/close`);
  }

  async reopenTask(taskId: string): Promise<void> {
    await this.req('POST', `${API_URL}/tasks/${taskId}/reopen`);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.req('DELETE', `${API_URL}/tasks/${taskId}`);
  }

  async addComment(taskId: string, content: string): Promise<void> {
    await this.req('POST', `${API_URL}/comments`, { task_id: taskId, content });
  }

  async createProject(name: string, parentId?: string): Promise<Project> {
    const raw = await this.req('POST', `${API_URL}/projects`, {
      name,
      ...(parentId ? { parent_id: parentId } : {}),
    });
    return { id: String(raw.id), name: raw.name ?? '', shared: Boolean(raw.is_shared ?? raw.shared) };
  }

  async createLabel(name: string): Promise<Label> {
    const raw = await this.req('POST', `${API_URL}/labels`, { name });
    return { id: String(raw.id), name: raw.name ?? '' };
  }

  async createSection(projectId: string, name: string): Promise<Section> {
    const raw = await this.req('POST', `${API_URL}/sections`, { project_id: projectId, name });
    return {
      id: String(raw.id),
      name: raw.name,
      projectId: String(raw.project_id),
      order: Number(raw.section_order ?? raw.order ?? 0),
    };
  }

  // There is no REST-style move endpoint; item_move is a sync command.
  async moveTask(taskId: string, dest: { projectId?: string; sectionId?: string }): Promise<void> {
    const args: Record<string, unknown> = { id: taskId };
    if (dest.sectionId) args.section_id = dest.sectionId;
    else if (dest.projectId) args.project_id = dest.projectId;
    const data = await this.req('POST', `${API_URL}/sync`, {
      commands: [{ type: 'item_move', uuid: crypto.randomUUID(), args }],
    });
    for (const status of Object.values(data?.sync_status ?? {})) {
      if (status !== 'ok') throw new Error(`item_move failed: ${JSON.stringify(status)}`);
    }
  }
}
