import React from 'react';
import { Search } from 'lucide-react';

interface FilterBarProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  totalCount,
}) => {
  const filters = [
    { key: 'all', label: '全部' },
    { key: 'open', label: '待办 (Open)' },
    { key: 'completed', label: '已完成' },
    { key: 'canceled', label: '已取消' },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-pills">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-pill ${statusFilter === f.key ? 'active' : ''}`}
            onClick={() => onStatusChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>共 {totalCount} 项</div>
        <div className="filter-search-box">
          <Search size={14} color="#9ca3af" />
          <input
            type="text"
            placeholder="搜索任务或标签..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
