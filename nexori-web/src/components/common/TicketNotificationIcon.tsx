// components/TicketNotificationIcon.tsx

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import TicketPanel from './TicketPanel';
import './TicketNotificationIcon.css';

const TicketNotificationIcon: React.FC = () => {
  const [openTickets, setOpenTickets] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    loadTicketStats();
    // Actualizar cada 30 segundos
    const interval = setInterval(loadTicketStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTicketStats = async () => {
    try {
      const stats = await ticketService.getStatistics();
      setOpenTickets(stats.open + stats.inProgress);
    } catch (error) {
      console.error('Error loading ticket stats:', error);
    }
  };

  const handlePanelUpdate = () => {
    loadTicketStats();
  };

  return (
    <>
      <button
        className="ticket-notification-icon"
        onClick={() => setIsPanelOpen(true)}
        title={`${openTickets} ticket${openTickets !== 1 ? 's' : ''} pendiente${openTickets !== 1 ? 's' : ''}`}
      >
        <MessageSquare size={20} />
        {openTickets > 0 && (
          <span className="ticket-notification-badge">
            {openTickets > 99 ? '99+' : openTickets}
          </span>
        )}
      </button>

      <TicketPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onUpdate={handlePanelUpdate}
      />
    </>
  );
};

export default TicketNotificationIcon;