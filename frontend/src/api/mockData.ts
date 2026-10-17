import { ListInfo, Task } from '../types/things';

export const MOCK_LISTS: ListInfo[] = [
  { id: 'TMInboxListSource', name: '收件箱', kind: 'builtin' },
  { id: 'TMTodayListSource', name: '今天', kind: 'builtin' },
  { id: 'TMNextListSource', name: '随时', kind: 'builtin' },
  { id: 'TMCalendarListSource', name: '计划', kind: 'builtin' },
  { id: 'TMSomedayListSource', name: '某天', kind: 'builtin' },
  { id: 'area_work', name: '工作', kind: 'area' },
  { id: 'area_study', name: '学习', kind: 'area' },
  { id: 'area_life', name: '消费与生活', kind: 'area' },
  { id: 'proj_things', name: 'ThingsWeb', kind: 'project', areaId: 'area_work', areaName: '工作' },
  { id: 'proj_ml', name: 'ML', kind: 'project', areaId: 'area_study', areaName: '学习' },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 'task_1',
    name: '买东西',
    status: 'open',
    notes: '牛奶、咖啡豆、面包',
    projectId: null,
    projectName: null,
    areaId: 'area_life',
    areaName: '消费与生活',
    tags: [],
    dueDate: null,
    activationDate: '2026-09-28',
    completionDate: null,
    cancellationDate: null,
    creationDate: '2026-09-27T16:05:31.000Z',
    modificationDate: '2026-09-27T16:05:34.000Z',
  },
  {
    id: 'task_2',
    name: '办理社保卡',
    status: 'open',
    notes: '携带身份证与一寸白底免冠照片前往市民服务中心二楼',
    projectId: null,
    projectName: null,
    areaId: null,
    areaName: null,
    tags: ['重要', '个人事务'],
    dueDate: '2026-10-05',
    activationDate: '2026-08-03',
    completionDate: null,
    cancellationDate: null,
    creationDate: '2026-08-03T00:34:47.000Z',
    modificationDate: '2026-09-22T13:27:31.000Z',
  },
  {
    id: 'task_3',
    name: '回家',
    status: 'open',
    notes: '',
    projectId: null,
    projectName: null,
    areaId: null,
    areaName: null,
    tags: [],
    dueDate: null,
    activationDate: '2026-09-28',
    completionDate: null,
    cancellationDate: null,
    creationDate: '2026-09-28T00:28:51.000Z',
    modificationDate: '2026-09-28T00:28:55.000Z',
  },
  {
    id: 'task_4',
    name: 'continous batch 特性调研与落地验证',
    status: 'open',
    notes: '阅读 vLLM 与 SGLang 的 continuous batching 调度器实现源码，对比吞吐性能提升',
    projectId: 'proj_ml',
    projectName: 'ML',
    areaId: 'area_study',
    areaName: '学习',
    tags: ['重要', '研究'],
    dueDate: '2026-10-12',
    activationDate: '2026-09-10',
    completionDate: null,
    cancellationDate: null,
    creationDate: '2026-09-02T01:08:56.000Z',
    modificationDate: '2026-09-22T13:27:31.000Z',
  },
  {
    id: 'task_5',
    name: 'Review ThingsWeb 开发计划与架构设计文档',
    status: 'completed',
    notes: '确认 JXA 契约和 Axum 后端路由设计',
    projectId: 'proj_things',
    projectName: 'ThingsWeb',
    areaId: 'area_work',
    areaName: '工作',
    tags: ['Architecture'],
    dueDate: null,
    activationDate: '2026-09-27',
    completionDate: '2026-09-28T10:00:00.000Z',
    cancellationDate: null,
    creationDate: '2026-09-27T08:00:00.000Z',
    modificationDate: '2026-09-28T10:00:00.000Z',
  },
];

let mockTasksStore: Task[] = [...MOCK_TASKS];

export function getMockTasks(): Task[] {
  return [...mockTasksStore];
}

export function addMockTask(task: Task): void {
  mockTasksStore = [task, ...mockTasksStore];
}

export function updateMockTaskStatus(id: string, status: 'open' | 'completed' | 'canceled'): Task | null {
  const index = mockTasksStore.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const updated: Task = {
    ...mockTasksStore[index],
    status,
    completionDate: status === 'completed' ? now : null,
    cancellationDate: status === 'canceled' ? now : null,
    modificationDate: now,
  };
  mockTasksStore = [
    ...mockTasksStore.slice(0, index),
    updated,
    ...mockTasksStore.slice(index + 1),
  ];
  return updated;
}

