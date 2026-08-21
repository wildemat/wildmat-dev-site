import type { Label, Project, Section, Snapshot, Task, TodoistApi } from '../src/todoist.js';

const today = () => new Date().toISOString().slice(0, 10);
const shiftDays = (days: number) =>
  new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);

export function seedSnapshot(): Snapshot {
  const task = (id: string, content: string, extra: Partial<Task> = {}): Task => ({
    id,
    content,
    description: '',
    projectId: 'p1',
    priority: 1,
    labels: [],
    completed: false,
    ...extra,
  });
  return {
    projects: [
      { id: 'p1', name: 'Moving', shared: true },
      { id: 'p2', name: 'House', shared: false },
    ],
    sections: [
      { id: 's1', name: 'Utilities', projectId: 'p1', order: 1 },
      { id: 's2', name: 'Packing', projectId: 'p1', order: 2 },
    ],
    tasks: [
      task('t1', 'Change utilities', { sectionId: 's1' }),
      task('t2', 'Schedule home inspection', {
        due: { date: shiftDays(-2), isRecurring: false },
        priority: 3,
      }),
      task('t3', 'Buy boxes', { sectionId: 's2', due: { date: today(), isRecurring: false } }),
      task('t4', 'Call movers for quotes', { labels: ['Waiting'], priority: 4 }),
      task('t5', 'Research schools', {
        description: 'blocked by house decision',
        due: { date: shiftDays(3), isRecurring: false },
      }),
      task('t6', 'Paint bedroom', { projectId: 'p2' }),
    ],
    comments: [],
    labels: [{ id: 'l1', name: 'Waiting' }],
    collaborators: [
      { id: 'u1', name: 'Matt Wilde', email: 'matt@example.com' },
      { id: 'u2', name: 'Courtney Wilde', email: 'court@example.com' },
    ],
  };
}

export class FakeApi implements TodoistApi {
  snap = seedSnapshot();
  calls: Array<[string, unknown]> = [];
  comments: Array<{ taskId: string; content: string }> = [];
  completed: Task[] = [];
  private n = 100;

  async snapshot(): Promise<Snapshot> {
    return structuredClone(this.snap);
  }

  private applyDue(task: Task, fields: Record<string, unknown>) {
    if (typeof fields.due_date === 'string') {
      task.due = { date: fields.due_date, isRecurring: false };
    } else if (typeof fields.due_string === 'string') {
      task.due = { date: '2099-01-01', string: fields.due_string, isRecurring: false };
    }
  }

  async createTask(fields: Record<string, unknown>): Promise<Task> {
    this.calls.push(['createTask', fields]);
    const task: Task = {
      id: `t${++this.n}`,
      content: String(fields.content ?? ''),
      description: String(fields.description ?? ''),
      projectId: String(fields.project_id),
      sectionId: fields.section_id ? String(fields.section_id) : undefined,
      parentId: fields.parent_id ? String(fields.parent_id) : undefined,
      priority: Number(fields.priority ?? 1),
      labels: (fields.labels as string[]) ?? [],
      assigneeId: fields.assignee_id ? String(fields.assignee_id) : undefined,
      completed: false,
    };
    this.applyDue(task, fields);
    this.snap.tasks.push(task);
    return structuredClone(task);
  }

  async updateTask(taskId: string, fields: Record<string, unknown>): Promise<Task> {
    this.calls.push(['updateTask', [taskId, fields]]);
    const task = this.snap.tasks.find((t) => t.id === taskId)!;
    if (typeof fields.content === 'string') task.content = fields.content;
    if (typeof fields.description === 'string') task.description = fields.description;
    if (fields.priority !== undefined) task.priority = Number(fields.priority);
    if (fields.labels !== undefined) task.labels = fields.labels as string[];
    if (fields.assignee_id !== undefined) task.assigneeId = String(fields.assignee_id);
    this.applyDue(task, fields);
    return structuredClone(task);
  }

  async closeTask(taskId: string): Promise<void> {
    this.calls.push(['closeTask', taskId]);
    const task = this.snap.tasks.find((t) => t.id === taskId)!;
    task.completed = true;
    this.snap.tasks = this.snap.tasks.filter((t) => t.id !== taskId);
    this.completed.push(task);
  }

  async reopenTask(taskId: string): Promise<void> {
    this.calls.push(['reopenTask', taskId]);
    const task = this.completed.find((t) => t.id === taskId);
    if (task) {
      task.completed = false;
      this.completed = this.completed.filter((t) => t.id !== taskId);
      this.snap.tasks.push(task);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    this.calls.push(['deleteTask', taskId]);
    this.snap.tasks = this.snap.tasks.filter((t) => t.id !== taskId);
  }

  async addComment(taskId: string, content: string): Promise<void> {
    this.calls.push(['addComment', [taskId, content]]);
    this.comments.push({ taskId, content });
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    this.calls.push(['getTask', taskId]);
    const found = [...this.snap.tasks, ...this.completed].find((t) => t.id === taskId);
    return found ? structuredClone(found) : undefined;
  }

  async completedTasks(): Promise<Task[]> {
    this.calls.push(['completedTasks', null]);
    return structuredClone(this.completed);
  }

  async createProject(name: string, parentId?: string): Promise<Project> {
    this.calls.push(['createProject', [name, parentId]]);
    const project = { id: `p${++this.n}`, name, shared: false };
    this.snap.projects.push(project);
    return project;
  }

  async createLabel(name: string): Promise<Label> {
    this.calls.push(['createLabel', name]);
    const label = { id: `l${++this.n}`, name };
    this.snap.labels.push(label);
    return label;
  }

  async createSection(projectId: string, name: string): Promise<Section> {
    this.calls.push(['createSection', [projectId, name]]);
    const section = { id: `s${++this.n}`, name, projectId, order: 99 };
    this.snap.sections.push(section);
    return section;
  }

  async moveTask(taskId: string, dest: { projectId?: string; sectionId?: string }): Promise<void> {
    this.calls.push(['moveTask', [taskId, dest]]);
    const task = this.snap.tasks.find((t) => t.id === taskId)!;
    if (dest.projectId) {
      task.projectId = dest.projectId;
      task.sectionId = undefined;
    }
    if (dest.sectionId) task.sectionId = dest.sectionId;
  }
}

export const testConfig = {
  defaultProject: 'Moving',
  defaultPriority: 'P3',
  duplicateThreshold: 0.9,
};
