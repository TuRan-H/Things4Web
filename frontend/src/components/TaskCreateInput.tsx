import React, { useState, useRef } from 'react';
import { Plus, Calendar, Tag, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { CreateTaskInput } from '../types/things';

interface TaskCreateInputProps {
  selectedList: string;
  onCreateTask: (input: CreateTaskInput) => Promise<void>;
}

export const TaskCreateInput: React.FC<TaskCreateInputProps> = ({
  selectedList,
  onCreateTask,
}) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const parsedTags = tagsStr
        ? tagsStr
            .split(/[,，]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      await onCreateTask({
        name: trimmedName,
        notes: notes.trim() || undefined,
        targetList: selectedList,
        dueDate: dueDate || undefined,
        tags: parsedTags,
      });

      // 清空表单并保持输入框聚焦，方便连续添加
      setName('');
      setNotes('');
      setDueDate('');
      setTagsStr('');
      setIsExpanded(false);
      inputRef.current?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建待办失败';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setName('');
      setSubmitError(null);
    }
  };

  return (
    <div className={`task-create-container ${isExpanded ? 'expanded' : ''}`}>
      <form onSubmit={handleSubmit} className="task-create-form">
        <div className="task-create-main-row">
          <div className="task-create-icon">
            <Plus size={18} color="#6366f1" />
          </div>

          <input
            ref={inputRef}
            type="text"
            className="task-create-input"
            placeholder={`在「${selectedList}」中添加待办，按 Enter 保存...`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />

          <div className="task-create-actions">
            <button
              type="button"
              className="task-create-toggle-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? '收起详情' : '展开更多选项（备注、日期、标签）'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <button
              type="submit"
              className="task-create-submit-btn"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 size={14} className="spinning" />
              ) : (
                <span>添加</span>
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="task-create-expanded-fields">
            <div className="task-create-field">
              <label>
                <FileText size={13} />
                备注说明
              </label>
              <textarea
                className="task-create-textarea"
                placeholder="添加任务备注或说明..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="task-create-row-fields">
              <div className="task-create-field">
                <label>
                  <Calendar size={13} />
                  截止日期
                </label>
                <input
                  type="date"
                  className="task-create-date-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="task-create-field" style={{ flex: 1 }}>
                <label>
                  <Tag size={13} />
                  标签 (逗号分隔)
                </label>
                <input
                  type="text"
                  className="task-create-tag-input"
                  placeholder="如: 重要, 个人, 紧急"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <div className="task-create-error">
            <span>{submitError}</span>
          </div>
        )}
      </form>
    </div>
  );
};
