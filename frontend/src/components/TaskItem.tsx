import React from 'react';
import { Circle, CheckCircle2, XCircle, Tag, Calendar, Folder, FileText } from 'lucide-react';
import { Task } from '../types/things';

interface TaskItemProps {
  task: Task;
  onSelect: (task: Task) => void;
  onToggleStatus?: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onSelect, onToggleStatus }) => {
  const isCompleted = task.status === 'completed';
  const isCanceled = task.status === 'canceled';

  const renderStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle2 size={18} className="task-checkbox checked" />;
    }
    if (isCanceled) {
      return <XCircle size={18} className="task-checkbox canceled" color="#9ca3af" />;
    }
    return <Circle size={18} className="task-checkbox unchecked" />;
  };

  return (
    <div
      className={`task-card ${isCompleted ? 'completed' : ''} ${isCanceled ? 'canceled' : ''}`}
      onClick={() => onSelect(task)}
    >
      <button
        type="button"
        className="task-checkbox-btn"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus?.(task);
        }}
        title={isCompleted ? '标为未完成' : '标为已完成'}
      >
        {renderStatusIcon()}
      </button>

      <div className="task-body">
        <div className="task-header-line">
          <span className="task-title">{task.name || '(无标题待办)'}</span>
        </div>

        {task.notes && (
          <div className="task-notes-preview">
            <FileText size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
            {task.notes}
          </div>
        )}

        <div className="task-meta">
          {task.projectName && (
            <span className="meta-chip chip-project">
              <Folder size={11} />
              {task.projectName}
            </span>
          )}

          {task.areaName && !task.projectName && (
            <span className="meta-chip chip-area">
              <Folder size={11} />
              {task.areaName}
            </span>
          )}

          {task.tags.map((tag) => (
            <span key={tag} className="meta-chip chip-tag">
              <Tag size={10} />
              {tag}
            </span>
          ))}

          {task.dueDate && (
            <span className="meta-chip chip-due">
              <Calendar size={11} />
              截止: {task.dueDate}
            </span>
          )}

          {task.activationDate && (
            <span className="meta-chip chip-activation">
              计划: {task.activationDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
