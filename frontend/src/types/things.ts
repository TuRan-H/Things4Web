export type TaskStatus = 'open' | 'completed' | 'canceled';

export type ListKind = 'builtin' | 'area' | 'project';

export interface ListInfo {
  id: string;
  name: string;
  kind: ListKind;
  areaId?: string | null;
  areaName?: string | null;
}

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  notes: string;
  projectId: string | null;
  projectName: string | null;
  areaId: string | null;
  areaName: string | null;
  tags: string[];
  dueDate: string | null;
  activationDate: string | null;
  completionDate: string | null;
  cancellationDate: string | null;
  creationDate: string | null;
  modificationDate: string | null;
}

export interface TaskQueryParams {
  listName?: string;
  listId?: string;
  status?: string;
}

export interface CreateTaskInput {
  name: string;
  notes?: string;
  targetList?: string;
  dueDate?: string | null;
  tags?: string[];
}

