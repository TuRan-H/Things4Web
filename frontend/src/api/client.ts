import { ListInfo, Task, TaskQueryParams } from '../types/things';
import { MOCK_LISTS, MOCK_TASKS } from './mockData';

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
    let tasks = [...MOCK_TASKS];
    if (params.status && params.status !== 'all') {
      tasks = tasks.filter((t) => t.status === params.status);
    }
    if (params.listName && params.listName !== '全部') {
      // 简单 mock 过滤
      if (params.listName === '今天') {
        tasks = tasks.filter((t) => t.activationDate === '2026-09-28');
      } else if (params.listName === '日志簿') {
        tasks = tasks.filter((t) => t.status === 'completed');
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

