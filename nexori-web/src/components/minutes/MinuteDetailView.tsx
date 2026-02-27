import React from 'react';
import { X, Calendar, User, MapPin, AlertCircle, CheckCircle, Edit3, Eye, Clock } from 'lucide-react';
import { Minute } from '@/types/minute';
import './MinuteDetailView.css';

interface MinuteDetailViewProps {
  minute: Minute;
  onClose: () => void;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

const MinuteDetailView: React.FC<MinuteDetailViewProps> = ({ minute, onClose }) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: 'Pendiente', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.1)' },
      reviewed: { label: 'Revisada', color: '#2196F3', bgColor: 'rgba(33, 150, 243, 0.1)' },
      closed: { label: 'Cerrada', color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.1)' },
    };
    return configs[status as keyof typeof configs];
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      high: { label: 'Alta', color: '#F44336', icon: AlertCircle },
      medium: { label: 'Media', color: '#FF9800', icon: AlertCircle },
      low: { label: 'Baja', color: '#4CAF50', icon: CheckCircle },
    };
    return configs[priority as keyof typeof configs];
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `${API_URL}${imagePath}`;
  };

  const statusConfig = getStatusConfig(minute.status);
  const priorityConfig = getPriorityConfig(minute.priority);

  return (
    <div className="minute-detail-overlay" onClick={onClose}>
      <div className="minute-detail-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="minute-detail-header">
          <div className="header-left">
            <div 
              className="status-badge" 
              style={{ 
                backgroundColor: statusConfig.bgColor,
                color: statusConfig.color 
              }}
            >
              {statusConfig.label}
            </div>
            <div 
              className="priority-badge"
              style={{
                backgroundColor: `${priorityConfig.color}20`,
                color: priorityConfig.color
              }}
            >
              <priorityConfig.icon size={14} />
              <span>{priorityConfig.label}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="minute-detail-content">
          {/* Título */}
          <h2 className="minute-title">{minute.title}</h2>

          {/* Descripción */}
          <div className="detail-section">
            <h3 className="section-title">Descripción</h3>
            <p className="section-text">{minute.description}</p>
          </div>

          {/* Imágenes adjuntas */}
          {minute.attachments && minute.attachments.length > 0 && (
            <div className="detail-section">
              <h3 className="section-title">
                Imágenes ({minute.attachments.length})
              </h3>
              <div className="images-grid">
                {minute.attachments.map((imagePath, index) => (
                  <div key={index} className="image-item">
                    <img
                      src={getImageUrl(imagePath)}
                      alt={`Imagen ${index + 1}`}
                      className="minute-image"
                      onClick={() => window.open(getImageUrl(imagePath), '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Línea de tiempo */}
          <div className="detail-section">
            <h3 className="section-title">Línea de tiempo</h3>
            <div className="timeline">

              {/* Creada */}
              <div className="timeline-item">
                <div className="timeline-connector">
                  <div className="timeline-dot timeline-dot--created">
                    <Edit3 size={14} />
                  </div>
                  {(minute.status === 'reviewed' || minute.status === 'closed') && (
                    <div className="timeline-line" />
                  )}
                </div>
                <div className="timeline-content">
                  <span className="timeline-label">Creada</span>
                  <span className="timeline-actor timeline-actor--created">{minute.reportedByName}</span>
                  <span className="timeline-date">
                    {new Date(minute.createdAt).toLocaleString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Revisada */}
              {(minute.status === 'reviewed' || minute.status === 'closed') && (
                <div className="timeline-item">
                  <div className="timeline-connector">
                    <div className="timeline-dot timeline-dot--reviewed">
                      <Eye size={14} />
                    </div>
                    {minute.status === 'closed' && (
                      <div className="timeline-line" />
                    )}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-label">Revisada</span>
                    {minute.resolvedByName && (
                      <span className="timeline-actor timeline-actor--reviewed">{minute.resolvedByName}</span>
                    )}
                    {minute.resolvedAt && (
                      <span className="timeline-date">
                        {new Date(minute.resolvedAt).toLocaleString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Cerrada */}
              {minute.status === 'closed' && (
                <div className="timeline-item">
                  <div className="timeline-connector">
                    <div className="timeline-dot timeline-dot--closed">
                      <CheckCircle size={14} />
                    </div>
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-label">Cerrada</span>
                    {minute.closedByName && (
                      <span className="timeline-actor timeline-actor--closed">{minute.closedByName}</span>
                    )}
                    {minute.closedAt && (
                      <span className="timeline-date">
                        {new Date(minute.closedAt).toLocaleString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Pendiente de revisión */}
              {minute.status === 'pending' && (
                <div className="timeline-pending-hint">
                  <Clock size={14} />
                  <span>Pendiente de revisión</span>
                </div>
              )}

            </div>
          </div>

          {/* Información adicional */}
          <div className="detail-section">
            <h3 className="section-title">Información</h3>
            <div className="info-grid">
              <div className="info-item">
                <User size={18} className="info-icon" />
                <div>
                  <span className="info-label">Reportado por</span>
                  <span className="info-value">{minute.reportedByName}</span>
                </div>
              </div>

              {minute.location && (
                <div className="info-item">
                  <MapPin size={18} className="info-icon" />
                  <div>
                    <span className="info-label">Ubicación</span>
                    <span className="info-value">{minute.location}</span>
                  </div>
                </div>
              )}

              <div className="info-item">
                <Calendar size={18} className="info-icon" />
                <div>
                  <span className="info-label">Fecha</span>
                  <span className="info-value">
                    {new Date(minute.createdAt).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {minute.assignedToName && (
                <div className="info-item">
                  <User size={18} className="info-icon" />
                  <div>
                    <span className="info-label">Asignado a</span>
                    <span className="info-value">{minute.assignedToName}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinuteDetailView;