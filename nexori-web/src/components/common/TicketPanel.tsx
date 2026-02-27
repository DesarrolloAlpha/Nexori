// components/TicketPanel.tsx - VERSIÓN CON PORTAL

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MessageSquare,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Send,
  TrendingUp,
  Loader,
} from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import type { Ticket } from '@/types/ticket';
import './TicketPanel.css';

interface TicketPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const TicketPanel: React.FC<TicketPanelProps> = ({ isOpen, onClose, onUpdate }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress'>('all');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTickets();
      // Bloquear scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar scroll del body
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, filter]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (filter !== 'all') {
        filters.status = filter;
      }
      const response = await ticketService.getAll(filters);
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await ticketService.updateStatus(ticketId, newStatus);
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const updated = await ticketService.getById(ticketId);
        setSelectedTicket(updated.data);
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await ticketService.addComment(selectedTicket.id, newComment);
      const updated = await ticketService.getById(selectedTicket.id);
      setSelectedTicket(updated.data);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeConfig = (type: string) => {
    const configs: any = {
      bug: { label: 'Error', color: '#EF4444', icon: '🐛' },
      feature: { label: 'Función', color: '#8B5CF6', icon: '✨' },
      feedback: { label: 'Feedback', color: '#3B82F6', icon: '💬' },
      question: { label: 'Pregunta', color: '#F59E0B', icon: '❓' },
      other: { label: 'Otro', color: '#6B7280', icon: '📋' },
    };
    return configs[type] || configs.other;
  };

  const getPriorityConfig = (priority: string) => {
    const configs: any = {
      low: { label: 'Baja', color: '#10B981' },
      medium: { label: 'Media', color: '#3B82F6' },
      high: { label: 'Alta', color: '#F59E0B' },
      urgent: { label: 'Urgente', color: '#EF4444' },
    };
    return configs[priority] || configs.medium;
  };

  const getStatusConfig = (status: string) => {
    const configs: any = {
      open: { label: 'Abierto', color: '#3B82F6', icon: AlertCircle },
      in_progress: { label: 'En Progreso', color: '#F59E0B', icon: Clock },
      resolved: { label: 'Resuelto', color: '#10B981', icon: CheckCircle },
      closed: { label: 'Cerrado', color: '#6B7280', icon: CheckCircle },
    };
    return configs[status] || configs.open;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Hace menos de 1 hora';
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  // USAR PORTAL PARA RENDERIZAR FUERA DEL DOM DEL DASHBOARD
  return createPortal(
    <>
      <div className="ticket-panel-overlay" onClick={onClose} />
      <div className={`ticket-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="ticket-panel-header">
          <div>
            <h2 className="ticket-panel-title">
              <MessageSquare size={20} />
              Tickets de Soporte
            </h2>
            <p className="ticket-panel-subtitle">
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          <button className="ticket-panel-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="ticket-filters">
          <button
            className={`ticket-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button
            className={`ticket-filter-btn ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            Abiertos
          </button>
          <button
            className={`ticket-filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            En Progreso
          </button>
        </div>

        {/* Content */}
        <div className="ticket-panel-content">
          {isLoading ? (
            <div className="ticket-loading">
              <Loader className="spinner" size={32} />
              <p>Cargando tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="ticket-empty">
              <MessageSquare size={48} />
              <p>No hay tickets {filter !== 'all' ? filter === 'open' ? 'abiertos' : 'en progreso' : 'disponibles'}</p>
            </div>
          ) : selectedTicket ? (
            /* Vista de detalle */
            <div className="ticket-detail">
              <button 
                className="ticket-back-btn"
                onClick={() => setSelectedTicket(null)}
              >
                ← Volver
              </button>

              {/* Header del ticket */}
              <div className="ticket-detail-header">
                <div className="ticket-detail-badges">
                  <span 
                    className="ticket-badge"
                    style={{ backgroundColor: `${getTypeConfig(selectedTicket.type).color}15`, color: getTypeConfig(selectedTicket.type).color }}
                  >
                    {getTypeConfig(selectedTicket.type).icon} {getTypeConfig(selectedTicket.type).label}
                  </span>
                  <span 
                    className="ticket-badge"
                    style={{ backgroundColor: `${getPriorityConfig(selectedTicket.priority).color}15`, color: getPriorityConfig(selectedTicket.priority).color }}
                  >
                    <TrendingUp size={12} /> {getPriorityConfig(selectedTicket.priority).label}
                  </span>
                </div>
                <h3 className="ticket-detail-title">{selectedTicket.subject}</h3>
                <p className="ticket-detail-description">{selectedTicket.description}</p>
                
                <div className="ticket-detail-meta">
                  <div className="ticket-meta-item">
                    <User size={14} />
                    <span>{selectedTicket.createdByName}</span>
                  </div>
                  <div className="ticket-meta-item">
                    <Clock size={14} />
                    <span>{formatDate(selectedTicket.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Cambiar estado */}
              <div className="ticket-status-actions">
                <label className="ticket-label">Estado:</label>
                <div className="ticket-status-buttons">
                  <button
                    className={`ticket-status-btn ${selectedTicket.status === 'open' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedTicket.id, 'open')}
                    disabled={selectedTicket.status === 'open'}
                  >
                    Abierto
                  </button>
                  <button
                    className={`ticket-status-btn ${selectedTicket.status === 'in_progress' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedTicket.id, 'in_progress')}
                    disabled={selectedTicket.status === 'in_progress'}
                  >
                    En Progreso
                  </button>
                  <button
                    className={`ticket-status-btn ${selectedTicket.status === 'resolved' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                    disabled={selectedTicket.status === 'resolved'}
                  >
                    Resuelto
                  </button>
                </div>
              </div>

              {/* Comentarios */}
              <div className="ticket-comments">
                <h4 className="ticket-comments-title">
                  <MessageSquare size={16} />
                  Comentarios ({selectedTicket.comments?.length || 0})
                </h4>
                
                <div className="ticket-comments-list">
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    selectedTicket.comments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className={`ticket-comment ${comment.isStaff ? 'staff' : ''}`}
                      >
                        <div className="ticket-comment-header">
                          <span className="ticket-comment-author">
                            {comment.authorName}
                            {comment.isStaff && <span className="staff-badge">Staff</span>}
                          </span>
                          <span className="ticket-comment-date">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="ticket-comment-message">{comment.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="ticket-no-comments">No hay comentarios aún</p>
                  )}
                </div>

                {/* Formulario de nuevo comentario */}
                <form className="ticket-comment-form" onSubmit={handleAddComment}>
                  <textarea
                    className="ticket-comment-input"
                    placeholder="Escribe un comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <button 
                    type="submit" 
                    className="ticket-comment-submit"
                    disabled={!newComment.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader className="spinner" size={16} />
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Lista de tickets */
            <div className="ticket-list">
              {tickets.map((ticket) => {
                const typeConfig = getTypeConfig(ticket.type);
                const priorityConfig = getPriorityConfig(ticket.priority);
                const statusConfig = getStatusConfig(ticket.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={ticket.id}
                    className="ticket-card"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="ticket-card-header">
                      <div className="ticket-card-badges">
                        <span 
                          className="ticket-card-type"
                          style={{ backgroundColor: `${typeConfig.color}15`, color: typeConfig.color }}
                        >
                          {typeConfig.icon}
                        </span>
                        <span 
                          className="ticket-card-priority"
                          style={{ backgroundColor: `${priorityConfig.color}15`, color: priorityConfig.color }}
                        >
                          {priorityConfig.label}
                        </span>
                      </div>
                      <StatusIcon 
                        size={16} 
                        style={{ color: statusConfig.color }}
                      />
                    </div>
                    
                    <h4 className="ticket-card-title">{ticket.subject}</h4>
                    <p className="ticket-card-description">{ticket.description}</p>
                    
                    <div className="ticket-card-footer">
                      <div className="ticket-card-user">
                        <User size={12} />
                        <span>{ticket.createdByName}</span>
                      </div>
                      <div className="ticket-card-meta">
                        {ticket.comments && ticket.comments.length > 0 && (
                          <span className="ticket-card-comments">
                            <MessageSquare size={12} />
                            {ticket.comments.length}
                          </span>
                        )}
                        <span className="ticket-card-date">
                          {formatDate(ticket.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body // RENDERIZAR EN EL BODY EN LUGAR DE DENTRO DEL DASHBOARD
  );
};

export default TicketPanel;