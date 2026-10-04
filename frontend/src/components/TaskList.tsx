import React from 'react';
import { CheckCircle2, Inbox, Loader2 } from 'lucide-react';
import { Task } from '../types/things';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onSelectTask: (task: Task) => void;
  selectedList: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading,
  onSelectTask,
  selectedList,
}) => {
  if (loading) {
    return (
      <div className="state-container">
        <Loader2 size={32} color="#3b82f6" className="refresh-button spinning" />
        <h3>正在从 Things3 查询任务...</h3>
        <p>执行 JXA 脚本中，请稍候</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="state-container">
        {selectedList === '收件箱' ? (
          <Inbox size={42} strokeWidth={1.5} color="#9ca3af" />
        ) : (
          <CheckCircle2 size={42} strokeWidth={1.5} color="#9ca3af" />
        )}
        <h3>当前清单没有任务</h3>
        <p>太棒了，所有事项都已处理完毕或符合筛选条件的待办为空。</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onSelect={onSelectTask} />
      ))}
    </div>
  );
};
