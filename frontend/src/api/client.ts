import { CreateTaskInput, ListInfo, Task, TaskQueryParams, TaskStatus } from '../types/things';
import { MOCK_LISTS, getMockTasks, addMockTask, updateMockTaskStatus } from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

export class ApiError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchLists(useMock = false): Promise<ListInfo[]> {
  if (useMock) {
    return MOCK_LISTS;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/lists`);
    if (!res.ok) {
      const errText = await res.text();
      throw new ApiError('HTTP_' + res.status, `获取清单列表失败 (${res.status}): ${errText}`);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('NETWORK_ERROR', `无法连接 ThingsWeb 后端服务 (${BASE_URL})，请确认后端已启动。`);
  }
}

export async function fetchTasks(params: TaskQueryParams = {}, useMock = false): Promise<Task[]> {
  if (useMock) {
    let tasks = getMockTasks();
    if (params.status && params.status !== 'all') {
      tasks = tasks.filter((t) => t.status === params.status);
    }
    if (params.listName && params.listName !== '全部') {
      // 简单 mock 过滤
      if (params.listName === '今天') {
        tasks = tasks.filter((t) => t.activationDate === '2026-09-28' || t.activationDate?.startsWith('2026-10'));
      } else if (params.listName === '收件箱') {
        tasks = tasks.filter((t) => !t.projectId && !t.areaId && !t.activationDate);
      } else {
        tasks = tasks.filter(
          (t) => t.areaName === params.listName || t.projectName === params.listName
        );
      }
    }
    return tasks;
  }

  const query = new URLSearchParams();
  if (params.listName) query.set('listName', params.listName);
  if (params.listId) query.set('listId', params.listId);
  if (params.status && params.status !== 'all') query.set('status', params.status);

  try {
    const url = `${BASE_URL}/api/v1/tasks?${query.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new ApiError('HTTP_' + res.status, `获取任务失败 (${res.status}): ${errText}`);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('NETWORK_ERROR', `无法连接 ThingsWeb 后端服务 (${BASE_URL})，请确认后端已启动。`);
  }
}

export async function createTask(input: CreateTaskInput, useMock = false): Promise<Task> {
  if (useMock) {
    const now = new Date().toISOString();
    const isToday = input.targetList === '今天' || input.targetList === 'TMTodayListSource';
    const newTask: Task = {
      id: 'mock_' + Date.now(),
      name: input.name,
      status: 'open',
      notes: input.notes || '',
      projectId: null,
      projectName: null,
      areaId: null,
      areaName: null,
      tags: input.tags || [],
      dueDate: input.dueDate || null,
      activationDate: isToday ? new Date().toISOString().slice(0, 10) : null,
      completionDate: null,
      cancellationDate: null,
      creationDate: now,
      modificationDate: now,
    };

    const lists = MOCK_LISTS;
    const target = lists.find((l) => l.name === input.targetList || l.id === input.targetList);
    if (target?.kind === 'project') {
      newTask.projectId = target.id;
      newTask.projectName = target.name;
      newTask.areaId = target.areaId || null;
      newTask.areaName = target.areaName || null;
    } else if (target?.kind === 'area') {
      newTask.areaId = target.id;
      newTask.areaName = target.name;
    }

    addMockTask(newTask);
    return newTask;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new ApiError('HTTP_' + res.status, `创建待办失败 (${res.status}): ${errText}`);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('NETWORK_ERROR', `无法连接 ThingsWeb 后端服务 (${BASE_URL}) 创建待办。`);
  }
}

export async function completeTask(
  id: string,
  status: TaskStatus = 'completed',
  useMock = false
): Promise<Task> {
  if (useMock) {
    const updated = updateMockTaskStatus(id, status);
    if (!updated) {
      throw new ApiError('NOT_FOUND', `未找到待办: ${id}`);
    }
    return updated;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/tasks/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new ApiError('HTTP_' + res.status, `更新待办状态失败 (${res.status}): ${errText}`);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('NETWORK_ERROR', `无法连接 ThingsWeb 后端服务 (${BASE_URL}) 更新状态。`);
  }
}

export async function refreshThings(relaunch = false, useMock = false): Promise<void> {
  if (useMock) {
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relaunch }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new ApiError('HTTP_' + res.status, `刷新 Things3 失败 (${res.status}): ${errText}`);
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('NETWORK_ERROR', `无法连接 ThingsWeb 后端服务 (${BASE_URL}) 进行刷新。`);
  }
}


