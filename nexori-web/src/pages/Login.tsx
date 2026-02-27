import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/common/Loading';
import logo from '@/assets/nexorinegativo.png';
import './Login.css';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      await login(formData);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Iniciando sesión..." />;
  }

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="mesh-gradient"></div>
      </div>

      {/* Glass Container */}
      <div className="login-glass-container">
        {/* Logo Section */}
        <div className="login-logo-section">
          <div className="logo-wrapper">
            <img src={logo} alt="Nexori" className="logo-image" />
          </div>
        </div>

        {/* Form Section */}
        <div className="login-form-section">
          <div className="form-header">
            <h2>Bienvenido</h2>
            <p>Ingresa tus credenciales para continuar</p>
          </div>

          {error && (
            <div className="error-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <div className="input-wrapper glass-input">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="input"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-wrapper glass-input">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="form-options">
              <label className="checkbox-wrapper">
                <input type="checkbox" />
                <span>Recordarme</span>
              </label>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn btn-primary btn-glass btn-lg">
              <span>Iniciar Sesión</span>
              <div className="btn-glow"></div>
            </button>

            {/* Register Link */}
            <div className="form-footer">
              <p>
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="form-link">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Features Section */}
        <div className="login-features">
          <div className="feature-item">
            <div className="feature-dot"></div>
            <span>Monitoreo en tiempo real</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot"></div>
            <span>Gestión eficiente</span>
          </div>
          <div className="feature-item">
            <div className="feature-dot"></div>
            <span>Alertas inteligentes</span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-status">
        <div className="status-dot"></div>
        <span>Conectado a servidor</span>
      </div>
    </div>
  );
};

export default Login;
