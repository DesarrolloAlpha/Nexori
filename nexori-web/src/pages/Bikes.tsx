import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, LogIn, LogOut, History, QrCode, Bike as BikeIcon, X } from 'lucide-react';
import { apiService } from '@/services/api';
import type { Bike, BikeFormData, BikeStatus } from '@/types';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import TableSkeleton from '@/components/common/TableSkeleton';
import ToastContainer from '@/components/common/ToastContainer';
import { useToast } from '@/hooks/useToast';
import './Bikes.css';

const Bikes: React.FC = () => {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [filteredBikes, setFilteredBikes] = useState<Bike[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BikeStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<any>(null);
  const [checkNotes, setCheckNotes] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning';
  } | null>(null);
  const { toasts, removeToast, success, error } = useToast();
  const [formData, setFormData] = useState<BikeFormData>({
    serialNumber: '',
    brand: '',
    model: '',
    color: '',
    ownerName: '',
    ownerDocument: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    loadBikes();
  }, []);

  useEffect(() => {
    filterBikes();
  }, [bikes, searchQuery, statusFilter]);

  const loadBikes = async () => {
    try {
      const data = await apiService.getBikes();
      setBikes(data);
    } catch (err: any) {
      console.error('Error al cargar bicicletas:', err);
      error(err.response?.data?.message || 'Error al cargar bicicletas');
    } finally {
      setIsLoading(false);
    }
  };

  const filterBikes = () => {
    let filtered = bikes;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((bike) => bike.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bike) =>
          bike.serialNumber.toLowerCase().includes(query) ||
          bike.model.toLowerCase().includes(query) ||
          bike.brand.toLowerCase().includes(query) ||
          bike.ownerName.toLowerCase().includes(query) ||
          bike.ownerDocument.toLowerCase().includes(query)
      );
    }

    setFilteredBikes(filtered);
  };

  const handleCreate = () => {
    setEditingBike(null);
    setFormData({
      serialNumber: '',
      brand: '',
      model: '',
      color: '',
      ownerName: '',
      ownerDocument: '',
      location: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (bike: Bike) => {
    setEditingBike(bike);
    setFormData({
      serialNumber: bike.serialNumber,
      brand: bike.brand,
      model: bike.model,
      color: bike.color,
      ownerName: bike.ownerName,
      ownerDocument: bike.ownerDocument,
      location: bike.location || '',
      notes: bike.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (bike: Bike) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar bicicleta?',
      message: `Esta acción eliminará permanentemente la bicicleta ${bike.serialNumber} (${bike.brand} ${bike.model}). Esta acción no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiService.deleteBike(bike.id);
          await loadBikes();
          success('Bicicleta eliminada correctamente');
        } catch (err: any) {
          error(err.response?.data?.message || 'Error al eliminar bicicleta');
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBike) {
        await apiService.updateBike(editingBike.id, formData);
        success('Bicicleta actualizada correctamente');
      } else {
        await apiService.createBike(formData);
        success('Bicicleta registrada correctamente');
      }
      await loadBikes();
      setIsModalOpen(false);
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al guardar bicicleta');
    }
  };

  const handleCheckInClick = (bike: Bike) => {
    setSelectedBike(bike);
    setCheckNotes('');
    setIsCheckInModalOpen(true);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBike) return;

    try {
      await apiService.checkInBike(selectedBike.id, checkNotes || undefined);
      await loadBikes();
      setIsCheckInModalOpen(false);
      success(`Bicicleta ${selectedBike.serialNumber} ingresada correctamente`);
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al ingresar bicicleta');
    }
  };

  const handleCheckOutClick = (bike: Bike) => {
    setSelectedBike(bike);
    setCheckNotes('');
    setIsCheckOutModalOpen(true);
  };

  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBike) return;

    try {
      await apiService.checkOutBike(selectedBike.id, checkNotes || undefined);
      await loadBikes();
      setIsCheckOutModalOpen(false);
      success(`Bicicleta ${selectedBike.serialNumber} retirada correctamente`);
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al retirar bicicleta');
    }
  };

  const handleViewHistory = async (bike: Bike) => {
    try {
      const history = await apiService.getBikeHistory(bike.id);
      setSelectedHistory({ bike, ...history });
      setIsHistoryModalOpen(true);
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al obtener historial');
    }
  };

  const getStatusBadge = (status: BikeStatus) => {
    const badges = {
      inside: 'badge-success',
      outside: 'badge-info',
      maintenance: 'badge-warning',
    };

    const labels = {
      inside: 'Dentro',
      outside: 'Fuera',
      maintenance: 'Mantenimiento',
    };

    return <span className={`badge ${badges[status]}`}>{labels[status]}</span>;
  };

  const getStatusCount = (status: BikeStatus | 'all') => {
    if (status === 'all') return bikes.length;
    return bikes.filter(b => b.status === status).length;
  };

  if (isLoading) {
    return (
      <div className="bikes-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-header-icon">
              <BikeIcon size={28} />
            </div>
            <div>
              <h1 className="page-title">Gestión de Bicicletas</h1>
              <p className="page-subtitle">Administra el registro de bicicletas del parqueadero</p>
            </div>
          </div>
        </div>
        <div className="filters-section">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input type="text" placeholder="Buscar..." className="search-input" disabled />
          </div>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="bikes-page">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <BikeIcon size={28} />
          </div>
          <div>
            <h1 className="page-title">Gestión de Bicicletas</h1>
            <p className="page-subtitle">Administra el registro de bicicletas del parqueadero</p>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleCreate}
          aria-label="Registrar nueva bicicleta"
        >
          <Plus size={20} />
          <span>Registrar Bicicleta</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Buscar por serial, marca, modelo, propietario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Buscar bicicletas"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="status-filters">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            aria-pressed={statusFilter === 'all'}
          >
            Todas
            <span className="filter-count">{getStatusCount('all')}</span>
          </button>
          <button
            className={`filter-btn ${statusFilter === 'inside' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inside')}
            aria-pressed={statusFilter === 'inside'}
          >
            Dentro
            <span className="filter-count">{getStatusCount('inside')}</span>
          </button>
          <button
            className={`filter-btn ${statusFilter === 'outside' ? 'active' : ''}`}
            onClick={() => setStatusFilter('outside')}
            aria-pressed={statusFilter === 'outside'}
          >
            Fuera
            <span className="filter-count">{getStatusCount('outside')}</span>
          </button>
          <button
            className={`filter-btn ${statusFilter === 'maintenance' ? 'active' : ''}`}
            onClick={() => setStatusFilter('maintenance')}
            aria-pressed={statusFilter === 'maintenance'}
          >
            Mantenimiento
            <span className="filter-count">{getStatusCount('maintenance')}</span>
          </button>
        </div>
      </div>

      {/* Tabla de Bicicletas */}
      {filteredBikes.length === 0 ? (
        <EmptyState
          icon={BikeIcon}
          title={searchQuery || statusFilter !== 'all'
            ? 'No se encontraron bicicletas'
            : 'No hay bicicletas registradas'
          }
          description={searchQuery || statusFilter !== 'all'
            ? 'Intenta ajustar los filtros de búsqueda'
            : 'Comienza registrando la primera bicicleta'
          }
          action={!(searchQuery || statusFilter !== 'all')
            ? { label: 'Registrar Bicicleta', onClick: handleCreate }
            : undefined
          }
        />
      ) : (
        <div className="bikes-table-container">
          <table className="bikes-table" role="table">
            <thead>
              <tr>
                <th scope="col">Serial</th>
                <th scope="col">Marca/Modelo</th>
                <th scope="col">Color</th>
                <th scope="col">Propietario</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredBikes.map((bike) => (
                <tr key={bike.id}>
                  <td data-label="Serial">
                    <div className="serial-cell">
                      <QrCode className="qr-icon" size={18} />
                      <span className="serial-number">{bike.serialNumber}</span>
                    </div>
                  </td>
                  <td data-label="Marca/Modelo">
                    <div className="bike-model">
                      <span className="brand-name">{bike.brand}</span>
                      <span className="model-name">{bike.model}</span>
                    </div>
                  </td>
                  <td data-label="Color">
                    <span className="bike-color">{bike.color}</span>
                  </td>
                  <td data-label="Propietario">
                    <div className="owner-cell">
                      <span className="owner-name">{bike.ownerName}</span>
                      <span className="owner-doc">{bike.ownerDocument}</span>
                    </div>
                  </td>
                  <td data-label="Estado">{getStatusBadge(bike.status)}</td>
                  <td data-label="Acciones">
                    <div className="action-buttons">
                      {bike.status === 'outside' && (
                        <button
                          className="btn-action btn-action-checkin"
                          onClick={() => handleCheckInClick(bike)}
                          aria-label="Ingresar bicicleta"
                          title="Ingresar"
                        >
                          <LogIn size={16} />
                        </button>
                      )}
                      {bike.status === 'inside' && (
                        <button
                          className="btn-action btn-action-checkout"
                          onClick={() => handleCheckOutClick(bike)}
                          aria-label="Retirar bicicleta"
                          title="Retirar"
                        >
                          <LogOut size={16} />
                        </button>
                      )}
                      <button
                        className="btn-action btn-action-history"
                        onClick={() => handleViewHistory(bike)}
                        aria-label="Ver historial"
                        title="Historial"
                      >
                        <History size={16} />
                      </button>
                      <button
                        className="btn-action btn-action-edit"
                        onClick={() => handleEdit(bike)}
                        aria-label="Editar bicicleta"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-action btn-action-delete"
                        onClick={() => handleDelete(bike)}
                        aria-label="Eliminar bicicleta"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBike ? 'Editar Bicicleta' : 'Registrar Bicicleta'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="bike-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="serialNumber" className="form-label">
                Número de Serie <span className="required">*</span>
              </label>
              <input
                type="text"
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="input"
                placeholder="Ej: BK-2024-001"
                required
                disabled={!!editingBike}
                autoFocus={!editingBike}
              />
              {editingBike && (
                <p className="form-helper">El número de serie no se puede modificar</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="brand" className="form-label">
                Marca <span className="required">*</span>
              </label>
              <input
                type="text"
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="input"
                placeholder="Ej: Trek, Giant, Specialized"
                required
                autoFocus={!!editingBike}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="model" className="form-label">
                Modelo <span className="required">*</span>
              </label>
              <input
                type="text"
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input"
                placeholder="Ej: Mountain Pro 2024"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="color" className="form-label">
                Color <span className="required">*</span>
              </label>
              <input
                type="text"
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="input"
                placeholder="Ej: Negro mate, Azul"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ownerName" className="form-label">
                Nombre del Propietario <span className="required">*</span>
              </label>
              <input
                type="text"
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="input"
                placeholder="Nombre completo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ownerDocument" className="form-label">
                Documento <span className="required">*</span>
              </label>
              <input
                type="text"
                id="ownerDocument"
                value={formData.ownerDocument}
                onChange={(e) => setFormData({ ...formData, ownerDocument: e.target.value })}
                className="input"
                placeholder="CC o identificación"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location" className="form-label">
              Ubicación
              <span className="form-hint">(Opcional)</span>
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input"
              placeholder="Ej: Parqueadero A, Nivel 2, Sección 3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notas
              <span className="form-hint">(Opcional)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
              placeholder="Información adicional, características especiales..."
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingBike ? 'Guardar Cambios' : 'Registrar Bicicleta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Check-In */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        title="Registrar Ingreso"
        size="md"
      >
        <form onSubmit={handleCheckInSubmit} className="check-form">
          <div className="check-info">
            <p>
              <strong>Bicicleta:</strong> {selectedBike?.brand} {selectedBike?.model}
            </p>
            <p>
              <strong>Serial:</strong> {selectedBike?.serialNumber}
            </p>
            <p>
              <strong>Propietario:</strong> {selectedBike?.ownerName}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="checkInNotes" className="form-label">
              Notas de ingreso
              <span className="form-hint">(Opcional)</span>
            </label>
            <textarea
              id="checkInNotes"
              value={checkNotes}
              onChange={(e) => setCheckNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Observaciones, condición de la bicicleta, etc."
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => setIsCheckInModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-success">
              <LogIn size={18} />
              Registrar Ingreso
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Check-Out */}
      <Modal
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        title="Registrar Salida"
        size="md"
      >
        <form onSubmit={handleCheckOutSubmit} className="check-form">
          <div className="check-info">
            <p>
              <strong>Bicicleta:</strong> {selectedBike?.brand} {selectedBike?.model}
            </p>
            <p>
              <strong>Serial:</strong> {selectedBike?.serialNumber}
            </p>
            <p>
              <strong>Propietario:</strong> {selectedBike?.ownerName}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="checkOutNotes" className="form-label">
              Notas de salida
              <span className="form-hint">(Opcional)</span>
            </label>
            <textarea
              id="checkOutNotes"
              value={checkNotes}
              onChange={(e) => setCheckNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Observaciones, condición de la bicicleta, etc."
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => setIsCheckOutModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-info">
              <LogOut size={18} />
              Registrar Salida
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Historial */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Historial de Bicicleta"
        size="md"
      >
        {selectedHistory && (
          <div className="history-content">
            <div className="history-header">
              <h3>{selectedHistory.bike.brand} {selectedHistory.bike.model}</h3>
              <p className="serial-number">Serial: {selectedHistory.bike.serialNumber}</p>
              <p className="owner-info">{selectedHistory.bike.ownerName}</p>
            </div>

            <div className="history-stats">
              <div className="stat-item">
                <span className="stat-label">Total Ingresos</span>
                <span className="stat-value">{selectedHistory.totalCheckIns || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Salidas</span>
                <span className="stat-value">{selectedHistory.totalCheckOuts || 0}</span>
              </div>
            </div>

            <div className="history-details">
              {selectedHistory.lastCheckIn && (
                <div className="detail-item">
                  <span className="detail-label">Último Ingreso</span>
                  <span className="detail-value">
                    {new Date(selectedHistory.lastCheckIn).toLocaleString('es-ES')}
                  </span>
                </div>
              )}
              {selectedHistory.lastCheckOut && (
                <div className="detail-item">
                  <span className="detail-label">Última Salida</span>
                  <span className="detail-value">
                    {new Date(selectedHistory.lastCheckOut).toLocaleString('es-ES')}
                  </span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Fecha de Registro</span>
                <span className="detail-value">
                  {new Date(selectedHistory.bike.createdAt || selectedHistory.registeredAt).toLocaleString('es-ES')}
                </span>
              </div>
            </div>

            {selectedHistory.bike.notes && (
              <div className="history-notes">
                <h4>Notas</h4>
                <p>{selectedHistory.bike.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmación */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.variant === 'danger' ? 'Eliminar' : 'Confirmar'}
        />
      )}
    </div>
  );
};

export default Bikes;