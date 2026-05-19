import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Files, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', label: 'Overview', Icon: BarChart3, end: true },
  { to: '/admin/resources', label: 'Manage Resources', Icon: Files },
  { to: '/admin/subjects', label: 'Subject Config', Icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/8 bg-[#0f1523] md:flex md:flex-col">
        <div className="border-b border-white/8 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck size={23} />
            </div>
            <div>
              <p className="text-lg font-bold">EduCrate Admin</p>
              <p className="text-xs text-textMuted truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-textMuted hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/8 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="md:ml-72">
        <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0f1523]/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Admin Panel</p>
              <h1 className="text-2xl font-bold">Resource Control Center</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:hidden">
              {navItems.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive ? 'bg-primary text-white' : 'bg-white/5 text-textMuted'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
