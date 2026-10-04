import React from 'react';
import {
  Inbox,
  Star,
  Layers,
  Calendar,
  Archive,
  Folder,
  CheckCircle2,
  Database,
  Radio,
  CircleDot,
} from 'lucide-react';
import { ListInfo } from '../types/things';

interface SidebarProps {
  lists: ListInfo[];
  selectedList: string;
  onSelectList: (name: string) => void;
  taskCounts: Record<string, number>;
  useMock: boolean;
  onToggleMock: () => void;
  backendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lists,
  selectedList,
  onSelectList,
  taskCounts,
  useMock,
  onToggleMock,
  backendOnline,
}) => {
  const getIconForBuiltin = (name: string) => {
    switch (name) {
      case '收件箱':
      case 'inbox':
        return <Inbox size={16} color="#3b82f6" />;
      case '今天':
      case 'today':
        return <Star size={16} color="#f59e0b" fill="#f59e0b" />;
      case '随时':
      case 'anytime':
        return <Layers size={16} color="#06b6d4" />;
      case '计划':
      case 'upcoming':
        return <Calendar size={16} color="#ec4899" />;
      case '某天':
      case 'someday':
        return <Archive size={16} color="#eab308" />;
      default:
        return <Layers size={16} color="#6b7280" />;
    }
  };

  const builtinLists = lists.filter((l) => l.kind === 'builtin');
  const areaLists = lists.filter((l) => l.kind === 'area');
  const projectLists = lists.filter((l) => l.kind === 'project');

  // 获取无所属区域的独立项目
  const standaloneProjects = projectLists.filter(
    (p) => !p.areaId && !p.areaName
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <CheckCircle2 size={18} />
        </div>
        <span className="sidebar-title">ThingsWeb</span>
        <span className="sidebar-badge">Demo</span>
      </div>

      <div className="sidebar-scroll">
        <div className="nav-section">
          <div className="nav-section-title">清单</div>
          {builtinLists.map((list) => {
            const count = taskCounts[list.name];
            const isActive = selectedList === list.name;
            return (
              <div
                key={list.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectList(list.name)}
              >
                <span className="nav-icon">{getIconForBuiltin(list.name)}</span>
                <span>{list.name}</span>
                {typeof count === 'number' && count > 0 && (
                  <span className="nav-count">{count}</span>
                )}
              </div>
            );
          })}
        </div>

        {areaLists.length > 0 && (
          <div className="nav-section">
            <div className="nav-section-title">区域 (Areas)</div>
            {areaLists.map((area) => {
              const isAreaActive = selectedList === area.name;
              const subProjects = projectLists.filter(
                (p) => p.areaId === area.id || p.areaName === area.name
              );

              return (
                <div key={area.id} style={{ marginBottom: 4 }}>
                  <div
                    className={`nav-item ${isAreaActive ? 'active' : ''}`}
                    onClick={() => onSelectList(area.name)}
                  >
                    <span className="nav-icon">
                      <Folder size={15} color="#8b5cf6" />
                    </span>
                    <span style={{ fontWeight: 500 }}>{area.name}</span>
                  </div>

                  {subProjects.length > 0 && (
                    <div style={{ marginLeft: 6 }}>
                      {subProjects.map((proj) => {
                        const isProjActive = selectedList === proj.name;
                        return (
                          <div
                            key={proj.id}
                            className={`nav-item sub-item ${isProjActive ? 'active' : ''}`}
                            onClick={() => onSelectList(proj.name)}
                          >
                            <span className="nav-icon">
                              <CircleDot size={13} color="#6366f1" />
                            </span>
                            <span>{proj.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {standaloneProjects.length > 0 && (
          <div className="nav-section">
            <div className="nav-section-title">项目 (Projects)</div>
            {standaloneProjects.map((proj) => {
              const isProjActive = selectedList === proj.name;
              return (
                <div
                  key={proj.id}
                  className={`nav-item ${isProjActive ? 'active' : ''}`}
                  onClick={() => onSelectList(proj.name)}
                >
                  <span className="nav-icon">
                    <CircleDot size={14} color="#6366f1" />
                  </span>
                  <span>{proj.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="mode-toggle" onClick={onToggleMock}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {useMock ? <Database size={14} color="#6b7280" /> : <Radio size={14} color="#10b981" />}
            <span>{useMock ? 'Mock 数据演示' : '真实 Things3 连接'}</span>
          </div>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: useMock ? '#9ca3af' : backendOnline ? '#10b981' : '#ef4444',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          {useMock ? '已启用离线示例数据' : backendOnline ? '已连接 127.0.0.1:3001' : '后端未联通 (点击切换Mock)'}
        </div>
      </div>
    </aside>
  );
};
