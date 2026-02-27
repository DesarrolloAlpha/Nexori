import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/nexorinegativo.png';
import {
  LayoutDashboard,
  Bike,
  Users,
  AlertTriangle,
  FileText,
  BarChart2,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import './Navbar.css';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'coordinator', 'supervisor'] },
    { name: 'Bicicletas', path: '/bikes', icon: Bike, roles: ['admin', 'coordinator', 'supervisor', 'guard'] },
    { name: 'Minutas', path: '/minutes', icon: FileText, roles: ['admin', 'coordinator', 'supervisor'] },
    { name: 'Pánico', path: '/panic', icon: AlertTriangle, roles: ['admin', 'coordinator', 'supervisor', 'operator', 'guard'] },
    { name: 'Usuarios', path: '/users', icon: Users, roles: ['admin', 'coordinator'] },
    { name: 'Reportes', path: '/reports', icon: BarChart2, roles: ['admin', 'coordinator', 'supervisor'] },
  ];

  const navItems = allNavItems.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
      {/* Logo */}
      <Link to="/dashboard" className="navbar-logo">
        <img src={logo} alt="Nexori" className="navbar-logo-img" />
      </Link>

        {/* Desktop Navigation */}
        <div className="navbar-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user?.name || 'Usuario'}</span>
            <span className="user-role">{user?.role || 'Usuario'}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-user">
            <span className="user-name">{user?.name || 'Usuario'}</span>
            <span className="user-role">{user?.role || 'Usuario'}</span>
          </div>
          
          <div className="mobile-nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <button className="mobile-logout" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;