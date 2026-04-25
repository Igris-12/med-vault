import { NavLink } from 'react-router-dom';
import { useMode } from '../../context/ModeContext';

const navItems = [
  { to: '/app/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/app/timeline', icon: '📈', label: 'Timeline' },
  { to: '/app/records', icon: '📁', label: 'Records' },
  { to: '/app/prescriptions', icon: '💊', label: 'Prescriptions' },
  { to: '/app/chat', icon: '💬', label: 'AI Chat' },
  { to: '/app/upload', icon: '⬆️', label: 'Upload' },
  { to: '/app/emergency', icon: '🆘', label: 'Emergency' },
];

export function SideNav() {
  const { mode, setMode } = useMode();

  return (
    <nav className="fixed left-0 top-0 h-screen w-14 hover:w-52 bg-surface border-r border-border-dim
                    transition-all duration-200 ease-out flex flex-col z-40 overflow-hidden group">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border-dim min-w-0">
        <span className="text-2xl flex-shrink-0">⚕️</span>
        <span className="font-sans font-bold text-teal opacity-0 group-hover:opacity-100
                         transition-opacity duration-150 delay-75 whitespace-nowrap">
          MedVault
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-1 p-2 mt-2">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item min-w-0 ${isActive ? 'active' : ''}`
            }
          >
            <span className="text-lg flex-shrink-0">{icon}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150
                             delay-75 whitespace-nowrap text-sm font-body">
              {label}
            </span>
          </NavLink>
        ))}
      </div>

      {/* Mode toggle at bottom */}
      <div className="p-2 border-t border-border-dim">
        <button
          onClick={() => setMode(mode === 'patient' ? 'doctor' : 'patient')}
          className="w-full nav-item justify-start min-w-0"
          title={`Switch to ${mode === 'patient' ? 'Doctor' : 'Patient'} mode`}
        >
          <span className="text-lg flex-shrink-0">{mode === 'patient' ? '👤' : '🩺'}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150
                           delay-75 whitespace-nowrap text-sm font-body capitalize">
            {mode} mode
          </span>
        </button>
      </div>
    </nav>
  );
}
