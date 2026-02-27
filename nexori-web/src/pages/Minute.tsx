import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Eye, CheckCircle, Calendar,
  User, MapPin, FileText, X, ChevronDown, ChevronUp,
  AlertCircle,
} from 'lucide-react';
import type { Minute, MinuteStatus, MinuteType } from '@/types/minute';
import { useMinutes } from '@/hooks/useMinutes';
import { CreateMinuteModal } from '@/components/minutes/CreateMinuteModal';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import ToastContainer from '@/components/common/ToastContainer';
import MinuteDetailView from '@/components/minutes/MinuteDetailView';
import { useToast } from '@/hooks/useToast';
import './Minute.css';

const Minutes: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MinuteStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MinuteType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { toasts, removeToast } = useToast();
  const { minutes, loading, createMinute, updateMinuteStatus } = useMinutes();

  // ── Filtrado cliente ──────────────────────────────────────────────────────
  const filteredMinutes = useMemo(() => {
    let result = minutes;
    if (statusFilter !== 'all') result = result.filter(m => m.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter(m => m.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.reportedByName.toLowerCase().includes(q) ||
        (m.assignedToName?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [minutes, statusFilter, typeFilter, searchQuery]);

  const getStatusCount = (s: MinuteStatus | 'all') =>
    s === 'all' ? minutes.length : minutes.filter(m => m.status === s).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleExpand = (id: string) =>
    setExpandedId(prev => prev === id ? null : id);

  const handleViewDetails = (minute: Minute, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMinute(minute);
    setIsDetailOpen(true);
  };

  const handleStatusChange = async (minute: Minute, newStatus: MinuteStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateMinuteStatus(minute.id, newStatus);
  };

  // ── Utils ─────────────────────────────────────────────────────────────────
  const getTypeLabel = (type: MinuteType): string => {
    const labels: Record<string, string> = {
      anotacion: 'Anotación',
      hurto: 'Hurto',
      novedad_vehiculo: 'Nov. Vehículo',
      objetos_abandonados: 'Obj. Abandonados',
      novedad: 'Novedad',
      observacion: 'Observación',
      recomendacion: 'Recomendación',
      nueva_marca: 'Nueva Marca',
      incidente: 'Incidente',
      emergencia: 'Emergencia',
      mantenimiento: 'Mantenimiento',
      persona_sospechosa: 'Pers. Sospechosa',
    };
    return labels[type] || type;
  };

  const getPriorityConfig = (priority: 'low' | 'medium' | 'high') => {
    const configs = {
      high:   { label: 'Alta',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   Icon: AlertCircle  },
      medium: { label: 'Media', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  Icon: AlertCircle  },
      low:    { label: 'Baja',  color: '#10B981', bg: 'rgba(16,185,129,0.1)',  Icon: CheckCircle  },
    };
    return configs[priority];
  };

  const getStatusConfig = (status: MinuteStatus) => {
    const configs = {
      pending:  { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
      reviewed: { label: 'Revisada',  color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
      closed:   { label: 'Cerrada',   color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
    };
    return configs[status];
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (loading) return <Loading fullScreen message="Cargando minutas..." />;

  return (
    <div className="minutes-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ── HEADER ── */}
      <div className="minutes-header-compact">
        <div className="header-top">
          <div className="header-title-section">
            <div className="header-icon"><FileText size={24} /></div>
            <div>
              <h1 className="page-title">Minutas</h1>
              <p className="page-subtitle">{minutes.length} registros</p>
            </div>
          </div>
          <button className="btn-create-mobile" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            <span>Nueva</span>
          </button>
        </div>

        {/* ── BÚSQUEDA ── */}
        <div className="search-box-compact">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Buscar minutas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Buscar minutas"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')} aria-label="Limpiar">
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── FILTROS ── */}
        <div className="filters-compact">
          <div className="filter-chips">
            {(['all', 'pending', 'reviewed', 'closed'] as const).map(s => (
              <button
                key={s}
                className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'Todas' : s === 'pending' ? 'Pendientes' : s === 'reviewed' ? 'Revisadas' : 'Cerradas'}
                <span className="count">{getStatusCount(s)}</span>
              </button>
            ))}
          </div>
          <select
            className="type-select-compact"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as MinuteType | 'all')}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos los tipos</option>
            <option value="novedad">Novedad</option>
            <option value="incidente">Incidente</option>
            <option value="emergencia">Emergencia</option>
            <option value="observacion">Observación</option>
            <option value="anotacion">Anotación</option>
            <option value="recomendacion">Recomendación</option>
            <option value="nueva_marca">Nueva Marca</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="hurto">Hurto</option>
            <option value="novedad_vehiculo">Novedad Vehículo</option>
            <option value="objetos_abandonados">Objetos Abandonados</option>
            <option value="persona_sospechosa">Persona Sospechosa</option>
          </select>
        </div>
      </div>

      {/* ── LISTA ── */}
      {filteredMinutes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
            ? 'No se encontraron minutas'
            : 'No hay minutas registradas'}
          description={searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
            ? 'Intenta ajustar los filtros de búsqueda'
            : 'Comienza creando tu primera minuta'}
          action={!(searchQuery || statusFilter !== 'all' || typeFilter !== 'all')
            ? { label: 'Crear Minuta', onClick: () => setIsModalOpen(true) }
            : undefined}
        />
      ) : (
        <div className="minute-list">
          {filteredMinutes.map(minute => {
            const isExpanded = expandedId === minute.id;
            const statusConfig = getStatusConfig(minute.status);
            const priorityConfig = getPriorityConfig(minute.priority);
            const PriorityIcon = priorityConfig.Icon;

            return (
              <div
                key={minute.id}
                className={`minute-list-item ${isExpanded ? 'expanded' : ''}`}
                onClick={() => handleToggleExpand(minute.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className={`item-status-indicator status-${minute.status}`} />

                <div className="item-content">
                  <div className="item-header">
                    <div className="item-title-wrapper">
                      <h3 className="item-title">{minute.title}</h3>
                      <span className="item-type">{getTypeLabel(minute.type)}</span>
                    </div>
                    <div className="item-expand-icon">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {!isExpanded && (
                    <p className="item-preview">{minute.description}</p>
                  )}

                  <div className="item-meta">
                    <span
                      className="meta-status-badge"
                      style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}
                    >
                      {statusConfig.label}
                    </span>
                    <span
                      className="meta-priority-badge"
                      style={{ color: priorityConfig.color, backgroundColor: priorityConfig.bg }}
                    >
                      <PriorityIcon size={11} />
                      {priorityConfig.label}
                    </span>
                    <span className="meta-user">
                      <User size={12} />
                      {minute.reportedByName}
                    </span>
                    <span className="meta-date">
                      <Calendar size={12} />
                      {formatDate(minute.createdAt)}
                    </span>
                    {minute.attachments && minute.attachments.length > 0 && (
                      <span className="attachments-badge">📷 {minute.attachments.length}</span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="item-expanded">
                      <div className="expanded-divider" />

                      <div className="expanded-section">
                        <h4>Descripción</h4>
                        <p>{minute.description}</p>
                      </div>

                      <div className="expanded-grid">
                        {minute.location && (
                          <div className="expanded-item">
                            <MapPin size={14} />
                            <div>
                              <span className="expanded-label">Ubicación</span>
                              <span className="expanded-value">{minute.location}</span>
                            </div>
                          </div>
                        )}
                        {minute.assignedToName && (
                          <div className="expanded-item">
                            <User size={14} />
                            <div>
                              <span className="expanded-label">Asignado a</span>
                              <span className="expanded-value">{minute.assignedToName}</span>
                            </div>
                          </div>
                        )}
                        {minute.resolvedAt && (
                          <div className="expanded-item">
                            <CheckCircle size={14} />
                            <div>
                              <span className="expanded-label">Revisada el</span>
                              <span className="expanded-value">{formatDateTime(minute.resolvedAt)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="expanded-actions">
                        <button
                          className="action-button primary"
                          onClick={e => handleViewDetails(minute, e)}
                        >
                          <Eye size={16} />
                          Ver detalles
                        </button>

                        {minute.status === 'pending' && (
                          <button
                            className="action-button success"
                            onClick={e => handleStatusChange(minute, 'reviewed', e)}
                          >
                            <CheckCircle size={16} />
                            Marcar revisada
                          </button>
                        )}

                        {minute.status === 'reviewed' && (
                          <button
                            className="action-button success"
                            onClick={e => handleStatusChange(minute, 'closed', e)}
                          >
                            <CheckCircle size={16} />
                            Cerrar minuta
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CREAR ── */}
      <CreateMinuteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async data => {
          const ok = await createMinute({
            title: data.title,
            description: data.description,
            priority: data.priority,
            type: data.category,
          });
          if (ok) setIsModalOpen(false);
        }}
        isEditing={false}
      />

      {/* ── MODAL DETALLES ── */}
      {isDetailOpen && selectedMinute && (
        <MinuteDetailView
          minute={selectedMinute}
          onClose={() => { setIsDetailOpen(false); setSelectedMinute(null); }}
        />
      )}
    </div>
  );
};

export default Minutes;
