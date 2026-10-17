import React from 'react';
import { X, Calendar, Tag, Folder, Hash, Clock } from 'lucide-react';
import { Task } from '../types/things';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onToggleStatus?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onToggleStatus,
}) => {
  if (!task) return null;

  const formatIso = (iso: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{task.name || '(无标题待办)'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="detail-row">
            <span className="detail-label">状态:</span>
            <span className="detail-value" style={{ display: 'inline-flex', alignItems: 'center', textTransform: 'capitalize' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  marginRight: 6,
                  backgroundColor:
                    task.status === 'completed'
                      ? '#10b981'
                      : task.status === 'canceled'
                      ? '#ef4444'
                      : '#3b82f6',
                }}
              />
              {task.status === 'open' ? '进行中 (Open)' : task.status === 'completed' ? '已完成 (Completed)' : '已取消 (Canceled)'}
              {onToggleStatus && (
                <button
                  type="button"
                  className="modal-toggle-status-btn"
                  onClick={() => onToggleStatus(task)}
                >
                  {task.status === 'completed' ? '设为未完成' : '设为已完成'}
                </button>
              )}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              <Hash size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
              任务 ID:
            </span>
            <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {task.id}
            </span>
          </div>

          {(task.projectName || task.areaName) && (
            <div className="detail-row">
              <span className="detail-label">
                <Folder size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                归属:
              </span>
              <span className="detail-value">
                {task.projectName ? `项目: ${task.projectName}` : ''}
                {task.projectName && task.areaName ? ' / ' : ''}
                {task.areaName ? `区域: ${task.areaName}` : ''}
              </span>
            </div>
          )}

          {task.tags.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">
                <Tag size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                标签:
              </span>
              <div className="detail-value" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {task.tags.map((tag) => (
                  <span key={tag} className="meta-chip chip-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(task.dueDate || task.activationDate) && (
            <div className="detail-row">
              <span className="detail-label">
                <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                日期规划:
              </span>
              <span className="detail-value">
                {task.activationDate && `计划开始: ${task.activationDate}`}
                {task.activationDate && task.dueDate ? ' ｜ ' : ''}
                {task.dueDate && `截止时间: ${task.dueDate}`}
              </span>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">
              <Clock size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
              时间戳:
            </span>
            <span className="detail-value" style={{ fontSize: 12, color: '#6b7280' }}>
              创建于 {formatIso(task.creationDate)}
              <br />
              修改于 {formatIso(task.modificationDate)}
              {task.completionDate && (
                <>
                  <br />
                  完成于 {formatIso(task.completionDate)}
                </>
              )}
            </span>
          </div>

          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              备注说明 (Notes):
            </div>
            {task.notes ? (
              <div className="notes-box">{task.notes}</div>
            ) : (
              <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>暂无备注</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
