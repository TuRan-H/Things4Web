import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, AlertCircle, Star, Layers, Calendar, Archive, Folder, Inbox, CircleDot } from 'lucide-react';
import { ListInfo, Task } from './types/things';
import { fetchLists, fetchTasks, refreshThings, ApiError } from './api/client';
import { Sidebar } from './components/Sidebar';
import { FilterBar } from './components/FilterBar';
import { TaskList } from './components/TaskList';
import { TaskDetailModal } from './components/TaskDetailModal';

export const App: React.FC = () => {
  const [lists, setLists] = useState<ListInfo[]>([]);
  const [selectedList, setSelectedList] = useState<string>('今天');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useMock, setUseMock] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);

  // 加载清单列表
  const loadLists = useCallback(async (mockMode: boolean) => {
    try {
      const data = await fetchLists(mockMode);
      setLists(data);
      setBackendOnline(true);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setBackendOnline(false);
        setError(err.message);
        // 如果后端不可达且当前不是 mock，则建议使用 mock
        if (!mockMode) {
          setUseMock(true);
        }
      }
    }
  }, []);

  // 加载待办任务
  const loadTasks = useCallback(
    async (listName: string, status: string, mockMode: boolean) => {
      setLoadingTasks(true);
      try {
        const data = await fetchTasks(
          {
            listName: listName,
            status: status === 'all' ? undefined : status,
          },
          mockMode
        );
        setTasks(data);
        setError(null);
        setBackendOnline(true);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
          setBackendOnline(false);
        } else {
          setError('未知错误发生');
        }
      } finally {
        setLoadingTasks(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // 初始化加载清单
  useEffect(() => {
    loadLists(useMock);
  }, [loadLists, useMock]);

  // 当选中的清单或状态筛选或 Mock 模式变更时重新加载任务
  useEffect(() => {
    if (selectedList) {
      loadTasks(selectedList, statusFilter, useMock);
    }
  }, [selectedList, statusFilter, useMock, loadTasks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshThings(false, useMock);
      await loadLists(useMock);
      await loadTasks(selectedList, statusFilter, useMock);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleMock = () => {
    const nextMock = !useMock;
    setUseMock(nextMock);
    setError(null);
  };

  // 根据搜索关键字过滤
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks;
    }
    const q = searchQuery.toLowerCase();
    return tasks.filter((t) => {
      const matchName = t.name.toLowerCase().includes(q);
      const matchNotes = t.notes.toLowerCase().includes(q);
      const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchProject = t.projectName?.toLowerCase().includes(q);
      const matchArea = t.areaName?.toLowerCase().includes(q);
      return matchName || matchNotes || matchTags || matchProject || matchArea;
    });
  }, [tasks, searchQuery]);

  // 标题栏图标
  const getHeaderIcon = (name: string) => {
    const selectedItem = lists.find((l) => l.name === name);
    if (selectedItem?.kind === 'project') {
      return <CircleDot size={22} color="#6366f1" />;
    }

    switch (name) {
      case '收件箱':
        return <Inbox size={22} color="#3b82f6" />;
      case '今天':
        return <Star size={22} color="#f59e0b" fill="#f59e0b" />;
      case '随时':
        return <Layers size={22} color="#06b6d4" />;
      case '计划':
        return <Calendar size={22} color="#ec4899" />;
      case '某天':
        return <Archive size={22} color="#eab308" />;
      default:
        return <Folder size={22} color="#8b5cf6" />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        lists={lists}
        selectedList={selectedList}
        onSelectList={(name) => setSelectedList(name)}
        taskCounts={{ [selectedList]: filteredTasks.length }}
        useMock={useMock}
        onToggleMock={handleToggleMock}
        backendOnline={backendOnline}
      />

      <main className="main-content">
        <header className="content-header">
          <div className="header-left">
            <div className="header-icon-wrapper">{getHeaderIcon(selectedList)}</div>
            <div>
              <h1 className="content-title">{selectedList}</h1>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {useMock ? '当前运行在离线演示模式' : '已连接 macOS Things3 本地服务'}
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`refresh-button ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={loadingTasks || isRefreshing}
              title="刷新任务"
            >
              <RefreshCw size={14} />
              <span>刷新</span>
            </button>
          </div>
        </header>

        <FilterBar
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={filteredTasks.length}
        />

        {error && (
          <div className="error-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            {!useMock && (
              <button onClick={() => setUseMock(true)}>
                切换为离线 Mock 演示
              </button>
            )}
          </div>
        )}

        <div className="task-list-container">
          <TaskList
            tasks={filteredTasks}
            loading={loadingTasks}
            onSelectTask={(task) => setSelectedTaskForModal(task)}
            selectedList={selectedList}
          />
        </div>
      </main>

      <TaskDetailModal
        task={selectedTaskForModal}
        onClose={() => setSelectedTaskForModal(null)}
      />
    </div>
  );
};
