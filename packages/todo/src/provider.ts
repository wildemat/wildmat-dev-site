/**
 * Backend-agnostic task service over the TodoistApi surface. Each public
 * method pulls one workspace snapshot, reasons against it, and issues writes.
 * Every automated mutation leaves an audit comment on the task.
 */

import * as matching from './matching.js';
import type {
  Collaborator, Project, Section, Snapshot, Task, TodoistApi,
} from './todoist.js';
import { priorityToApi, priorityToLabel } from './todoist.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BLOCKED_HINT = /\b(blocked by|waiting on|depends on)\b/i;

export type ProviderConfig = {
  defaultProject: string;
  defaultPriority: string;
  duplicateThreshold: number;
};

export class TaskLookupError extends Error {}

type Rendered = Record<string, unknown>;

export type CreateArgs = {
  title: string;
  description?: string;
  project?: string;
  section?: string;
  labels?: string[];
  priority?: string;
  due?: string;
  assignee?: string;
  parentId?: string;
  context?: string;
};

export type UpdateArgs = {
  title?: string;
  description?: string;
  priority?: string;
  due?: string;
  labels?: string[];
  section?: string;
  context?: string;
};

function openTasks(snap: Snapshot, projectId?: string): Task[] {
  return snap.tasks.filter(
    (t) => !t.completed && (projectId === undefined || t.projectId === projectId),
  );
}

export class TodoProvider {
  constructor(
    private api: TodoistApi,
    private config: ProviderConfig,
  ) {}

  // -- rendering ---------------------------------------------------------

  private render(snap: Snapshot, task: Task, withComments = false): Rendered {
    const project = snap.projects.find((p) => p.id === task.projectId);
    const section = snap.sections.find((s) => s.id === task.sectionId);
    const assignee = snap.collaborators.find((c) => c.id === task.assigneeId);
    const out: Rendered = {
      id: task.id,
      title: task.content,
      project: project?.name ?? task.projectId,
      priority: priorityToLabel(task.priority),
      completed: task.completed,
    };
    if (task.description) out.description = task.description;
    if (section) out.section = section.name;
    if (task.labels.length) out.labels = task.labels;
    if (task.due) out.due = { date: task.due.date, string: task.due.string };
    if (assignee) out.assignee = assignee.name;
    if (withComments) {
      out.comments = snap.comments
        .filter((c) => c.taskId === task.id)
        .sort((a, b) => (a.postedAt ?? '').localeCompare(b.postedAt ?? ''))
        .map((c) => ({ content: c.content, posted_at: c.postedAt }));
    }
    return out;
  }

  // -- resolution ----------------------------------------------------------

  private resolveProject(snap: Snapshot, name?: string): Project {
    const wanted = (name ?? this.config.defaultProject).trim().toLowerCase();
    const exact = snap.projects.find((p) => p.name.trim().toLowerCase() === wanted);
    if (exact) return exact;
    const scored = snap.projects
      .map((p): [Project, number] => [p, matching.similarity(wanted, p.name)])
      .sort((a, b) => b[1] - a[1]);
    if (scored.length && scored[0][1] >= 0.8) return scored[0][0];
    const names = snap.projects.map((p) => p.name).join(', ') || '(none)';
    throw new TaskLookupError(`No project matching '${name ?? wanted}'. Known projects: ${names}`);
  }

  private async resolveSection(snap: Snapshot, project: Project, name: string): Promise<Section> {
    const existing = snap.sections.find(
      (s) => s.projectId === project.id && matching.similarity(name, s.name) >= 0.8,
    );
    if (existing) return existing;
    return this.api.createSection(project.id, name);
  }

  private resolveTask(snap: Snapshot, ref: string, project?: string): Task {
    const trimmed = ref.trim();
    const byId = snap.tasks.find((t) => t.id === trimmed);
    if (byId) return byId;
    const projectId = project ? this.resolveProject(snap, project).id : undefined;
    const ranked = matching.rank(trimmed, openTasks(snap, projectId));
    if (ranked.length && ranked[0][1] >= 0.6) return ranked[0][0];
    const near = ranked.slice(0, 3).map(([t]) => `'${t.content}'`).join(', ');
    throw new TaskLookupError(`No task matching '${ref}'.${near ? ` Closest: ${near}` : ''}`);
  }

  private resolvePerson(snap: Snapshot, person: string): Collaborator {
    const wanted = person.trim().toLowerCase();
    let best: [Collaborator, number] | undefined;
    for (const collab of snap.collaborators) {
      const tokens = [
        ...collab.name.toLowerCase().split(/\s+/),
        (collab.email ?? '').split('@')[0].toLowerCase(),
      ].filter(Boolean);
      let score = Math.max(0, ...tokens.map((t) => matching.similarity(wanted, t)));
      if (tokens.some((t) => t.startsWith(wanted))) score = 1;
      if (!best || score > best[1]) best = [collab, score];
    }
    if (best && best[1] >= 0.75) return best[0];
    const names = snap.collaborators.map((c) => c.name).join(', ');
    throw new TaskLookupError(`No collaborator matching '${person}'. Known: ${names}`);
  }

  // -- audit comments --------------------------------------------------------

  private async audit(
    taskId: string,
    action: string,
    opts: { context?: string; speaker?: string; quote?: string } = {},
  ): Promise<void> {
    const lines = [`${action} from ChatGPT conversation`, new Date().toISOString().slice(0, 10)];
    if (opts.speaker && opts.quote) lines.push(`${opts.speaker} said:\n"${opts.quote}"`);
    else if (opts.quote) lines.push(`"${opts.quote}"`);
    else if (opts.context) lines.push(opts.context);
    await this.api.addComment(taskId, lines.join('\n\n'));
  }

  // -- reads --------------------------------------------------------------

  async listProjects(): Promise<Rendered[]> {
    const snap = await this.api.snapshot();
    return snap.projects
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, name: p.name, shared: p.shared }));
  }

  async listLabels(): Promise<Rendered[]> {
    const snap = await this.api.snapshot();
    return snap.labels
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((l) => ({ id: l.id, name: l.name }));
  }

  async getProject(name?: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const project = this.resolveProject(snap, name);
    const tasks = openTasks(snap, project.id);
    const children = (parentId: string) => tasks.filter((t) => t.parentId === parentId);
    const tree = (task: Task): Rendered => {
      const node = this.render(snap, task, true);
      const kids = children(task.id);
      if (kids.length) node.subtasks = kids.map(tree);
      return node;
    };
    const roots = tasks.filter((t) => !t.parentId);
    const sections = snap.sections
      .filter((s) => s.projectId === project.id)
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        name: section.name,
        tasks: roots.filter((t) => t.sectionId === section.id).map(tree),
      }));
    return {
      id: project.id,
      name: project.name,
      sections,
      unsectioned_tasks: roots.filter((t) => !t.sectionId).map(tree),
      open_task_count: tasks.length,
    };
  }

  async searchTasks(query: string, project?: string, includeCompleted = false): Promise<Rendered[]> {
    const snap = await this.api.snapshot();
    const projectId = project ? this.resolveProject(snap, project).id : undefined;
    const pool = snap.tasks.filter(
      (t) =>
        (includeCompleted || !t.completed) &&
        (projectId === undefined || t.projectId === projectId),
    );
    return matching
      .search(query, pool)
      .map(([task, score]) => ({ ...this.render(snap, task), match_score: Math.round(score * 100) / 100 }));
  }

  // -- container writes -----------------------------------------------------

  /** Create a project; returns the existing one if a near-identical name is already there. */
  async createProject(name: string, parent?: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const existing = snap.projects.find(
      (p) => matching.similarity(name, p.name) >= this.config.duplicateThreshold,
    );
    if (existing) {
      return {
        action: 'exists',
        reason: 'a project with this name already exists',
        project: { id: existing.id, name: existing.name, shared: existing.shared },
      };
    }
    const parentId = parent ? this.resolveProject(snap, parent).id : undefined;
    const project = await this.api.createProject(name, parentId);
    return {
      action: 'created',
      project: { id: project.id, name: project.name, shared: project.shared },
    };
  }

  async createSection(name: string, project?: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const target = this.resolveProject(snap, project);
    const existing = snap.sections.find(
      (s) =>
        s.projectId === target.id && matching.similarity(name, s.name) >= this.config.duplicateThreshold,
    );
    const section = existing ?? (await this.api.createSection(target.id, name));
    return {
      action: existing ? 'exists' : 'created',
      section: { id: section.id, name: section.name, project: target.name },
    };
  }

  async createLabel(name: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const existing = snap.labels.find(
      (l) => matching.similarity(name, l.name) >= this.config.duplicateThreshold,
    );
    const label = existing ?? (await this.api.createLabel(name));
    return { action: existing ? 'exists' : 'created', label: { id: label.id, name: label.name } };
  }

  // -- writes --------------------------------------------------------------

  async createTask(args: CreateArgs): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const target = this.resolveProject(snap, args.project);

    // Idempotency: a near-identical open task means update, not duplicate.
    const existing = matching.findMatch(
      args.title,
      openTasks(snap, target.id),
      this.config.duplicateThreshold,
    );
    if (existing) {
      const updated = await this.updateTask(existing.id, {
        description: args.description || undefined,
        priority: args.priority,
        due: args.due,
        labels: args.labels,
        section: args.section,
        context: args.context ?? `Duplicate of existing task detected: '${args.title}'`,
      });
      return { action: 'updated_existing', reason: 'duplicate detected', task: updated.task };
    }

    const fields: Record<string, unknown> = {
      content: args.title,
      project_id: target.id,
      priority: priorityToApi(args.priority, this.config.defaultPriority),
    };
    if (args.description) fields.description = args.description;
    if (args.labels?.length) fields.labels = args.labels;
    if (args.parentId) fields.parent_id = args.parentId;
    if (args.section) fields.section_id = (await this.resolveSection(snap, target, args.section)).id;
    if (args.due) fields[ISO_DATE.test(args.due) ? 'due_date' : 'due_string'] = args.due;
    if (args.assignee) fields.assignee_id = this.resolvePerson(snap, args.assignee).id;

    const task = await this.api.createTask(fields);
    if (args.context) await this.audit(task.id, 'Created', { context: args.context });
    return { action: 'created', task: this.render(snap, task) };
  }

  async updateTask(ref: string, args: UpdateArgs): Promise<{ action: string; task: Rendered }> {
    const snap = await this.api.snapshot();
    let target = this.resolveTask(snap, ref);
    const fields: Record<string, unknown> = {};
    if (args.title) fields.content = args.title;
    if (args.description) fields.description = args.description;
    if (args.priority) fields.priority = priorityToApi(args.priority);
    if (args.labels !== undefined) fields.labels = args.labels;
    if (args.due) fields[ISO_DATE.test(args.due) ? 'due_date' : 'due_string'] = args.due;

    if (Object.keys(fields).length) {
      target = await this.api.updateTask(target.id, fields);
    }
    if (args.section) {
      const project = snap.projects.find((p) => p.id === target.projectId)!;
      const section = await this.resolveSection(snap, project, args.section);
      await this.api.moveTask(target.id, { sectionId: section.id });
      target = { ...target, sectionId: section.id };
    }
    await this.audit(target.id, 'Updated', { context: args.context });
    return { action: 'updated', task: this.render(snap, target) };
  }

  async completeTask(
    ref: string,
    opts: { comment?: string; speaker?: string; quote?: string } = {},
  ): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const target = this.resolveTask(snap, ref);
    await this.api.closeTask(target.id);
    await this.audit(target.id, 'Completed', {
      context: opts.comment,
      speaker: opts.speaker,
      quote: opts.quote,
    });
    return { action: 'completed', task: this.render(snap, { ...target, completed: true }) };
  }

  async reopenTask(ref: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const target = snap.tasks.find((t) => t.id === ref.trim()) ?? this.resolveTask(snap, ref);
    await this.api.reopenTask(target.id);
    await this.audit(target.id, 'Reopened');
    return { action: 'reopened', task: this.render(snap, { ...target, completed: false }) };
  }

  async deleteTask(ref: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const target = this.resolveTask(snap, ref);
    await this.api.deleteTask(target.id);
    return { action: 'deleted', task: { id: target.id, title: target.content } };
  }

  async addComment(ref: string, content: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const target = this.resolveTask(snap, ref);
    await this.api.addComment(target.id, content);
    return { action: 'commented', task: { id: target.id, title: target.content } };
  }

  async moveTask(ref: string, dest: { section?: string; project?: string }): Promise<Rendered> {
    const snap = await this.api.snapshot();
    let target = this.resolveTask(snap, ref);
    if (!dest.section && !dest.project) {
      throw new TaskLookupError('move_task needs a section and/or project');
    }
    if (dest.project) {
      const project = this.resolveProject(snap, dest.project);
      await this.api.moveTask(target.id, { projectId: project.id });
      target = { ...target, projectId: project.id, sectionId: undefined };
    }
    if (dest.section) {
      const owner = snap.projects.find((p) => p.id === target.projectId)!;
      const section = await this.resolveSection(snap, owner, dest.section);
      await this.api.moveTask(target.id, { sectionId: section.id });
      target = { ...target, sectionId: section.id };
    }
    await this.audit(target.id, 'Moved');
    return { action: 'moved', task: this.render(snap, target) };
  }

  async assignTask(ref: string, person: string): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const target = this.resolveTask(snap, ref);
    const collab = this.resolvePerson(snap, person);
    const updated = await this.api.updateTask(target.id, { assignee_id: collab.id });
    await this.audit(target.id, `Assigned to ${collab.name}`);
    return { action: 'assigned', assignee: collab.name, task: this.render(snap, updated) };
  }

  // -- views ---------------------------------------------------------------

  private byPriority(snap: Snapshot, tasks: Task[]): Record<string, Rendered[]> {
    const grouped: Record<string, Rendered[]> = {};
    for (const task of tasks.slice().sort((a, b) => b.priority - a.priority)) {
      (grouped[priorityToLabel(task.priority)] ??= []).push(this.render(snap, task));
    }
    return grouped;
  }

  async today(): Promise<Rendered> {
    const snap = await this.api.snapshot();
    const now = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    const overdue: Task[] = [];
    const todayDue: Task[] = [];
    const upcoming: Task[] = [];
    for (const task of openTasks(snap)) {
      if (!task.due) continue;
      if (task.due.date < now) overdue.push(task);
      else if (task.due.date === now) todayDue.push(task);
      else if (task.due.date <= horizon) upcoming.push(task);
    }
    return {
      overdue: this.byPriority(snap, overdue),
      today: this.byPriority(snap, todayDue),
      upcoming_7_days: this.byPriority(snap, upcoming),
    };
  }

  async nextActions(limit = 8): Promise<Rendered[]> {
    const snap = await this.api.snapshot();
    const skip = new Set(['waiting', 'someday', 'blocked']);
    const now = new Date().toISOString().slice(0, 10);
    const eligible = openTasks(snap).filter(
      (t) =>
        !t.labels.some((l) => skip.has(l.toLowerCase())) && !BLOCKED_HINT.test(t.description),
    );
    const key = (t: Task): [number, number, string, string] => [
      t.due && t.due.date < now ? 0 : 1,
      -t.priority,
      t.due?.date ?? '9999-12-31',
      t.createdAt ?? '',
    ];
    eligible.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      for (let i = 0; i < ka.length; i++) {
        if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
      }
      return 0;
    });
    return eligible.slice(0, limit).map((t) => this.render(snap, t));
  }

  async waiting(): Promise<Rendered[]> {
    const snap = await this.api.snapshot();
    return openTasks(snap)
      .filter((t) => t.labels.some((l) => l.toLowerCase() === 'waiting'))
      .map((t) => this.render(snap, t));
  }

  async blocked(): Promise<Rendered[]> {
    const snap = await this.api.snapshot();
    return openTasks(snap)
      .filter(
        (t) =>
          t.labels.some((l) => l.toLowerCase() === 'blocked') || BLOCKED_HINT.test(t.description),
      )
      .map((t) => this.render(snap, t));
  }

  async sync(): Promise<Rendered> {
    const snap = await this.api.snapshot();
    return {
      synced: true,
      projects: snap.projects.length,
      open_tasks: openTasks(snap).length,
      labels: snap.labels.length,
    };
  }
}
