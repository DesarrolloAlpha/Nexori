import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, Clock, CheckCircle, User, Shield, Bell, 
  Activity, Wifi, WifiOff, ChevronDown, ChevronUp, 
  Zap, PlayCircle
} from 'lucide-react';
import { alarmSound } from '@/services/alarmSound';
import type { PanicEvent, PanicStatus } from '@/types';
// ✅ CAMBIO 1: Importar usePanic en lugar de useSocket
import { usePanic } from '@/hooks/usePanic';
import Loading from '@/components/common/Loading';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import ToastContainer from '@/components/common/ToastContainer';
import { useToast } from '@/hooks/useToast';
import './Panic.css';

const Panic: React.FC = () => {
  // ✅ CAMBIO 2: Usar el hook usePanic
  const {
    events,
    activeAlerts,
    inProgressAlerts: attendedAlerts,
    resolvedAlerts,
    loading: isLoading,
    error: hookError,
    isConnected,
    createPanic,
    updateStatus,
  } = usePanic();

  const [filteredEvents, setFilteredEvents] = useState<PanicEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<PanicStatus | 'all'>('all');
  
  // Modal y estados de UI (SIN CAMBIOS)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PanicEvent | null>(null);
  const [notes, setNotes] = useState('');
  const [showConfirmPanic, setShowConfirmPanic] = useState(false);
  
  const [isMuted, setIsMuted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { toasts, removeToast, success, error } = useToast();

  const hasActiveAlerts = activeAlerts.length > 0;

  // ===== EFFECTS =====
  
  // ✅ CAMBIO 3: Ya no necesitamos cargar eventos manualmente (el hook lo hace)
  // useEffect(() => {
  //   loadEvents();
  // }, []);

  // ✅ CAMBIO 4: Ya no necesitamos listeners de socket (el hook lo maneja)
  // Los listeners ya están en usePanic

  // Control de sonido (SIN CAMBIOS)
  useEffect(() => {
    if (isMuted) return;

    if (activeAlerts.length > 0) {
      if (!alarmSound.getIsPlaying()) {
        alarmSound.play();
      }
    } else {
      if (alarmSound.getIsPlaying()) {
        alarmSound.stop();
      }
    }
  }, [activeAlerts.length, isMuted]);

  // Filtrado (SIN CAMBIOS)
  useEffect(() => {
    filterEvents();
  }, [events, statusFilter]);

  // ✅ CAMBIO 5: Mostrar errores del hook
  useEffect(() => {
    if (hookError) {
      error(hookError);
    }
  }, [hookError, error]);

  // ===== FUNCIONES =====

  const filterEvents = () => {
    if (statusFilter === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(e => e.status === statusFilter));
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      alarmSound.stop();
      success('🔇 Sonido silenciado');
    } else {
      success('🔊 Sonido activado');
    }
  };

  const handleConfirmPanic = () => setShowConfirmPanic(true);

  // ✅ CAMBIO 6: Usar createPanic del hook
  const handleCreatePanic = async () => {
    try {
      const result = await createPanic('high');
      if (result) {
        success('🚨 Alerta de pánico enviada');
      }
    } catch (err: any) {
      error('Error al enviar alerta de pánico');
    } finally {
      setShowConfirmPanic(false);
    }
  };

  const handleUpdateStatus = (event: PanicEvent) => {
    setSelectedEvent(event);
    setNotes('');
    setIsModalOpen(true);
  };

  // ✅ CAMBIO 7: Usar updateStatus del hook
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      const newStatus = selectedEvent.status === 'active' ? 'attended' : 'resolved';
      const result = await updateStatus(selectedEvent.id, newStatus, notes || undefined);
      
      if (result) {
        setIsModalOpen(false);
        success(`Evento ${newStatus === 'attended' ? 'atendido' : 'resuelto'} correctamente`);
      }
    } catch (err: any) {
      error('Error al actualizar estado del evento');
    }
  };

  const handleToggleExpand = (eventId: string) => {
    setExpandedId(expandedId === eventId ? null : eventId);
  };

  // ===== UTILS (SIN CAMBIOS) =====
  const getStatusCount = (status: PanicStatus | 'all') => {
    if (status === 'all') return events.length;
    return events.filter(e => e.status === status).length;
  };


  const getStatusLabel = (status: PanicStatus) => {
    const labels = { active: 'Activa', attended: 'Atendida', resolved: 'Resuelta' };
    return labels[status];
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;
    
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <Loading fullScreen message="Cargando sistema de emergencias..." />;
  }

  return (
    <div className="panic-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* ===== HEADER COMPACTO ===== */}
      <div className="panic-header-compact">
        <div className="header-top">
          <div className="header-title-section">
            <div className="header-icon">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h1 className="page-title">Emergencias</h1>
              <div className="connection-status">
                {isConnected ? (
                  <>
                    <Wifi size={14} color="#10b981" />
                    <span style={{ color: '#10b981' }}>Tiempo real</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={14} color="#ef4444" />
                    <span style={{ color: '#ef4444' }}>Desconectado</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className={`btn-mute ${isMuted ? 'muted' : ''}`}
              onClick={toggleMute}
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              <Bell size={18} />
            </button>
            
            <button 
              className="btn-panic-mobile"
              onClick={handleConfirmPanic}
              aria-label="Botón de pánico"
            >
              <Zap size={20} />
              <span>PÁNICO</span>
            </button>
          </div>
        </div>

        {hasActiveAlerts && !isMuted && alarmSound.getIsPlaying() && (
          <div className="audio-indicator">
            <span className="pulse-dot" />
            <span>Alarma sonando</span>
          </div>
        )}
      </div>

      {/* ===== CENTRO DE ATENCIÓN ===== */}
      <div className="emergency-control-center">
        {/* ALERTAS ACTIVAS */}
        <div className="active-alerts-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Bell size={18} />
              <h2>Alertas Activas</h2>
            </div>
            <span className="alert-count">{activeAlerts.length}</span>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="no-alerts">
              <Shield size={32} />
              <p>No hay alertas activas</p>
              <span>Sistema estable</span>
            </div>
          ) : (
            <div className="active-alerts-list">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="active-alert-card">
                  <div className="alert-info">
                    <div className="alert-user-row">
                      <span className="alert-user-name">{alert.userName}</span>
                      <span className="alert-time">{formatTimestamp(alert.timestamp)}</span>
                    </div>
                    
                    <div className="alert-meta"></div>
                  </div>

                  <div className="alert-actions">
                    <button
                      className="btn-attend"
                      onClick={() => handleUpdateStatus(alert)}
                    >
                      <PlayCircle size={18} />
                      <span>Atender</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ESTADÍSTICAS COMPACTAS */}
        <div className="stats-compact">
          <div className="stat-item">
            <div className="stat-icon attended">
              <Activity size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{attendedAlerts.length}</span>
              <span className="stat-label">Atendidas</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon resolved">
              <CheckCircle size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{resolvedAlerts.length}</span>
              <span className="stat-label">Resueltas</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon total">
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{events.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FILTROS COMPACTOS ===== */}
      <div className="filters-compact">
        <div className="filter-chips">
          <button
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todas
            <span className="count">{getStatusCount('all')}</span>
          </button>
          <button
            className={`filter-chip ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Activas
            <span className="count">{getStatusCount('active')}</span>
          </button>
          <button
            className={`filter-chip ${statusFilter === 'attended' ? 'active' : ''}`}
            onClick={() => setStatusFilter('attended')}
          >
            Atendidas
            <span className="count">{getStatusCount('attended')}</span>
          </button>
          <button
            className={`filter-chip ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resueltas
            <span className="count">{getStatusCount('resolved')}</span>
          </button>
        </div>
      </div>

      {/* ===== LISTA DE EVENTOS (EXPANDIBLE) ===== */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No hay eventos"
          description="Los eventos de pánico aparecerán aquí"
        />
      ) : (
        <div className="panic-event-list">
          {filteredEvents.map((event) => {
            const isExpanded = expandedId === event.id;
            
            return (
              <div
                key={event.id}
                className={`panic-event-item status-${event.status}`}
                onClick={() => handleToggleExpand(event.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className={`event-status-indicator status-${event.status}`} />

                <div className="event-content">
                  <div className="event-header-compact">
                    <div className="event-main-info">
                      <div className="event-title-row">
                        <span className="event-user-name">{event.userName}</span>
                        <span className="event-time">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      <div className="event-badges">
                        <span className={`status-badge status-${event.status}`}>
                          {getStatusLabel(event.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="event-expand-icon">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {!isExpanded && event.notes && (
                    <p className="event-preview">{event.notes}</p>
                  )}

                  {isExpanded && (
                    <div className="event-expanded">
                      <div className="expanded-divider" />
                      
                      {event.attendedBy && (
                        <div className="expanded-row">
                          <User size={14} />
                          <span>Atendido por: <strong>{event.attendedBy}</strong></span>
                        </div>
                      )}
                      
                      {event.notes && (
                        <div className="expanded-notes">
                          <span className="notes-label">Notas:</span>
                          <p>{event.notes}</p>
                        </div>
                      )}

                      {event.attachments && event.attachments.length > 0 && (
                        <div className="expanded-attachments">
                          <span className="notes-label">Evidencia fotográfica:</span>
                          <div className="attachments-grid">
                            {event.attachments.map((imgPath, idx) => {
                              const serverUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');
                              const imgUrl = imgPath.startsWith('http') ? imgPath : `${serverUrl}${imgPath}`;
                              return (
                                <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={imgUrl} alt={`Evidencia ${idx + 1}`} className="attachment-thumbnail" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {event.resolvedAt && (
                        <div className="expanded-row">
                          <CheckCircle size={14} />
                          <span>Resuelto: {formatTimestamp(event.resolvedAt)}</span>
                        </div>
                      )}

                      <div className="expanded-actions">
                        {event.status === 'active' && (
                          <button
                            className="action-button attend"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(event);
                            }}
                          >
                            <PlayCircle size={16} />
                            Atender
                          </button>
                        )}
                        {event.status === 'attended' && (
                          <button
                            className="action-button resolve"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(event);
                            }}
                          >
                            <CheckCircle size={16} />
                            Resolver
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

      {/* ===== MODAL - Atender/Resolver ===== */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedEvent?.status === 'active' ? 'Atender Evento' : 'Resolver Evento'}
        size="md"
      >
        <form onSubmit={handleSubmitUpdate} className="update-form">
          <div className="form-info">
            <p>
              Estás {selectedEvent?.status === 'active' ? 'atendiendo' : 'resolviendo'} el evento de <strong>{selectedEvent?.userName}</strong>
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notas sobre la {selectedEvent?.status === 'active' ? 'atención' : 'resolución'}
              <span className="form-hint">(Opcional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={5}
              placeholder="Describe las acciones tomadas, observaciones o detalles relevantes..."
            />
            <p className="form-helper">
              Estas notas quedarán registradas en el historial del evento
            </p>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className={`btn ${selectedEvent?.status === 'active' ? 'btn-warning' : 'btn-success'}`}
            >
              {selectedEvent?.status === 'active' ? 'Marcar como Atendida' : 'Marcar como Resuelta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== CONFIRMACIÓN - Botón de pánico ===== */}
      {showConfirmPanic && (
        <ConfirmDialog
          isOpen={showConfirmPanic}
          onClose={() => setShowConfirmPanic(false)}
          onConfirm={handleCreatePanic}
          title="¿Activar Botón de Pánico?"
          message="Se enviará una alerta de emergencia a todo el personal. Esta acción debe usarse solo en situaciones reales."
          variant="danger"
          confirmText="Activar Alerta"
        />
      )}
    </div>
  );
};

export default Panic;