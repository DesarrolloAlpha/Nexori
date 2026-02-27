import React, { useState } from 'react';
import { 
  X, ChevronDown, ChevronUp, CheckCircle, AlertCircle, 
  Info, AlertTriangle, FileText, Car, Package, Megaphone, 
  Eye, Lightbulb, Wrench, User 
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import './CreateMinuteModal.css';

// Tipos (deben coincidir con el móvil)
type Category = 'anotacion' | 'hurto' | 'novedad_vehiculo' | 'objetos_abandonados' | 'novedad' | 'observacion' | 'recomendacion' | 'incidente' | 'emergencia' | 'mantenimiento' | 'persona_sospechosa';

type Priority = 'high' | 'medium' | 'low';

interface CreateMinuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (minute: {
    title: string;
    description: string;
    priority: Priority;
    category: Category;
  }) => void;
  isEditing?: boolean;
  initialData?: {
    title: string;
    description: string;
    priority: Priority;
    category: Category;
  };
}

// Configuración de categorías (iconos corregidos)
const categories = [
  { value: 'novedad' as const, label: 'Novedad', icon: Megaphone, color: '#0066FF' },
  { value: 'incidente' as const, label: 'Incidente', icon: AlertTriangle, color: '#FF9800' },
  { value: 'emergencia' as const, label: 'Emergencia', icon: AlertTriangle, color: '#F44336' },
  { value: 'observacion' as const, label: 'Observación', icon: Eye, color: '#2196F3' },
  { value: 'anotacion' as const, label: 'Anotación', icon: FileText, color: '#4CAF50' },
  { value: 'recomendacion' as const, label: 'Recomendación', icon: Lightbulb, color: '#9C27B0' }, // 🔥 Cambiado Bulb → Lightbulb
  { value: 'mantenimiento' as const, label: 'Mantenimiento', icon: Wrench, color: '#FF5722' },
  { value: 'hurto' as const, label: 'Hurto', icon: AlertCircle, color: '#F44336' },
  { value: 'novedad_vehiculo' as const, label: 'Novedad Vehículo', icon: Car, color: '#FF9800' },
  { value: 'objetos_abandonados' as const, label: 'Objetos Abandonados', icon: Package, color: '#9E9E9E' }, // 🔥 Cambiado Cube → Package
  { value: 'persona_sospechosa' as const, label: 'Persona Sospechosa', icon: User, color: '#673AB7' },
];

// Configuración de prioridades
const priorities = [
  { 
    value: 'high' as const, 
    label: 'Alta', 
    color: '#F44336', 
    icon: AlertTriangle,
    bgColor: 'rgba(244, 67, 54, 0.1)'
  },
  { 
    value: 'medium' as const, 
    label: 'Media', 
    color: '#FF9800', 
    icon: AlertCircle,
    bgColor: 'rgba(255, 152, 0, 0.1)'
  },
  { 
    value: 'low' as const, 
    label: 'Baja', 
    color: '#4CAF50', 
    icon: CheckCircle,
    bgColor: 'rgba(76, 175, 80, 0.1)'
  },
];

export const CreateMinuteModal: React.FC<CreateMinuteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isEditing = false,
  initialData
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState<Priority>(initialData?.priority || 'medium');
  const [category, setCategory] = useState<Category>(initialData?.category || 'novedad');
  const [categoryExpanded, setCategoryExpanded] = useState(false);

  const selectedCategory = categories.find(c => c.value === category);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Por favor ingresa un título');
      return;
    }
    if (!description.trim()) {
      alert('Por favor ingresa una descripción');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
    });

    // Reset form si no es edición
    if (!isEditing) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('novedad');
    }
    setCategoryExpanded(false);
  };

  const handleClose = () => {
    if (!isEditing) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('novedad');
    }
    setCategoryExpanded(false);
    onClose();
  };

  const handleSelectCategory = (cat: Category) => {
    setCategory(cat);
    setCategoryExpanded(false);
  };

  const getCategoryIcon = (IconComponent: any, color: string) => {
    return <IconComponent size={20} color={color} />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar Minuta' : 'Nueva Minuta'}
      size="lg"
      showCloseButton={false}
    >
      <div className="minute-form-container">
        {/* Header del modal */}
        <div className="minute-modal-header">
          <div className="minute-modal-title">
            <div className="title-icon">
              <FileText size={22} color="#0066FF" />
            </div>
            <h2>{isEditing ? 'Editar Minuta' : 'Nueva Minuta'}</h2>
          </div>
          <button className="close-button" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="minute-form">
          {/* Categoría con Acordeón */}
          <div className="form-group">
            <label className="form-label">
              Categoría <span className="required">*</span>
            </label>

            {/* Header del acordeón */}
            <button
              type="button"
              className={`category-header ${categoryExpanded ? 'expanded' : ''}`}
              onClick={() => setCategoryExpanded(!categoryExpanded)}
            >
              <div className="category-selected">
                <div className="category-icon" style={{ backgroundColor: `${selectedCategory?.color}20` }}>
                  {selectedCategory && getCategoryIcon(selectedCategory.icon, selectedCategory.color)}
                </div>
                <span className="category-name">{selectedCategory?.label}</span>
              </div>
              {categoryExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {/* Lista desplegable de categorías */}
            {categoryExpanded && (
              <div className="category-dropdown">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`category-item ${category === cat.value ? 'selected' : ''}`}
                    onClick={() => handleSelectCategory(cat.value)}
                  >
                    <div className="category-item-content">
                      <div className="category-icon" style={{ backgroundColor: `${cat.color}20` }}>
                        {getCategoryIcon(cat.icon, cat.color)}
                      </div>
                      <span className="category-name" style={{ color: category === cat.value ? cat.color : undefined }}>
                        {cat.label}
                      </span>
                    </div>
                    {category === cat.value && (
                      <CheckCircle size={18} color={cat.color} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Título */}
          <div className="form-group">
            <label className="form-label">
              Título <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Inspección de ronda nocturna"
              maxLength={100}
              autoFocus
            />
            <div className="char-counter">
              {title.length}/100 caracteres
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label">
              Descripción <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la novedad, incidente o información relevante..."
              rows={5}
              maxLength={500}
            />
            <div className="char-counter">
              {description.length}/500 caracteres
            </div>
          </div>

          {/* Prioridad */}
          <div className="form-group">
            <label className="form-label">
              Prioridad <span className="required">*</span>
            </label>
            <div className="priority-grid">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`priority-card ${priority === p.value ? 'selected' : ''}`}
                  onClick={() => setPriority(p.value)}
                  style={{
                    borderColor: priority === p.value ? p.color : '#E5E7EB',
                    backgroundColor: priority === p.value ? p.bgColor : '#FFFFFF'
                  }}
                >
                  <div className="priority-icon" style={{ backgroundColor: p.bgColor }}>
                    <p.icon size={24} color={p.color} />
                  </div>
                  <span className="priority-label" style={{ color: priority === p.value ? p.color : '#6B7280' }}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Info adicional */}
          <div className="info-box">
            <Info size={18} color="#2196F3" />
            <p className="info-text">
              Esta minuta será registrada con tu usuario y la fecha/hora actual. 
              La categoría permitirá filtrar y generar reportes específicos.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <CheckCircle size={18} />
              {isEditing ? 'Guardar Cambios' : 'Guardar Minuta'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};