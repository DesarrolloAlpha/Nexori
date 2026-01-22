import { Server } from 'socket.io';

export const setupWebSocket = (io: Server): void => {
  io.on('connection', (socket) => {
    console.log('🔌 Nuevo cliente conectado:', socket.id);

    // Unirse a sala específica por rol o usuario
    socket.on('join_room', (room: string) => {
      socket.join(room);
      console.log(`👥 Socket ${socket.id} se unió a la sala: ${room}`);
    });

    // Evento de botón de pánico
    socket.on('panic_alert', (data) => {
      console.log('🚨 Alerta de pánico recibida:', data);
      
      // Emitir a coordinadores y administradores
      socket.to('coordinators').to('admins').emit('new_panic_alert', {
        ...data,
        timestamp: new Date(),
      });
      
      // También emitir a todos los supervisores
      socket.to('supervisors').emit('new_panic_alert', {
        ...data,
        timestamp: new Date(),
      });
    });

    // Evento de ingreso/salida de bicicletas
    socket.on('bike_check_in', (data) => {
      console.log('🚲 Ingreso de bicicleta:', data);
      socket.to('operators').to('coordinators').emit('bike_checked_in', data);
    });

    socket.on('bike_check_out', (data) => {
      console.log('🚲 Salida de bicicleta:', data);
      socket.to('operators').to('coordinators').emit('bike_checked_out', data);
    });

    // Evento de minuta virtual creada
    socket.on('minute_created', (data) => {
      console.log('📝 Minuta virtual creada:', data);
      
      // Emitir según el tipo y prioridad
      if (data.priority === 'high') {
        socket.to('admins').to('coordinators').emit('high_priority_minute', data);
      }
      
      socket.to('supervisors').emit('new_minute', data);
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectado:', socket.id);
    });

    // Manejar errores
    socket.on('error', (error) => {
      console.error('❌ Error en WebSocket:', error);
    });
  });
  console.log('✅ WebSocket configurado');
};