import React from 'react';
import { Clock, User, Image as ImageIcon } from 'lucide-react';
import { Minute } from '@/types/minute';

interface MinuteCardProps {
  minute: Minute;
  onClick: () => void;
}

const MinuteCard: React.FC<MinuteCardProps> = ({ minute, onClick }) => {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#FF9800',
      reviewed: '#2196F3',
      closed: '#4CAF50',
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: '#F44336',
      medium: '#FF9800',
      low: '#4CAF50',
    };
    return colors[priority as keyof typeof colors] || '#6B7280';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `Hace ${minutes} min`;
    }
    if (hours < 24) {
      return `Hace ${hours}h`;
    }
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  const statusColor = getStatusColor(minute.status);
  const priorityColor = getPriorityColor(minute.priority);

  return (
    <div
      className="minute-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: '12px',
        padding: '1rem',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        border: '1px solid var(--border-light, #E5E7EB)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header con badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {minute.status === 'pending' ? 'Pendiente' : minute.status === 'reviewed' ? 'Revisada' : 'Cerrada'}
          </span>
          
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: `${priorityColor}20`,
              color: priorityColor,
            }}
          >
            {minute.priority === 'high' ? 'Alta' : minute.priority === 'medium' ? 'Media' : 'Baja'}
          </span>

          {/* Indicador de imágenes */}
          {minute.attachments && minute.attachments.length > 0 && (
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <ImageIcon size={12} />
              {minute.attachments.length}
            </span>
          )}
        </div>
      </div>

      {/* Título */}
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary, #1F2937)',
          margin: '0 0 0.5rem 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {minute.title}
      </h3>

      {/* Descripción */}
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary, #6B7280)',
          margin: '0 0 1rem 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {minute.description}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary, #9CA3AF)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <User size={14} color="currentColor" />
          <span>{minute.reportedByName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Clock size={14} color="currentColor" />
          <span>{formatDate(minute.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default MinuteCard;