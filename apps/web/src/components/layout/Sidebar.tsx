import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  AlertCircle,
  FileText,
  BarChart3,
  Sliders,
  Download,
  Settings,
  Link2,
  List,
  ScrollText,
  LogOut,
  Database,
  Camera,
  Users,
  GitMerge,
  Upload,
  FileSearch,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import Logo from '@/components/ui/Logo';

const navItems = [
  { path: '/', label: 'Executive Summary', icon: LayoutDashboard, badge: null },
  { path: '/data', label: 'Data Explorer', icon: Database, badge: null },
  { path: '/uploads', label: 'Manual Uploads', icon: Upload, badge: null },
  { path: '/identity/queue', label: 'Identity Queue', icon: GitMerge, badge: null },
  { path: '/identity/resolved', label: 'Resolved Customers', icon: Users, badge: null },
  { path: '/issues', label: 'Issues & Risk', icon: AlertCircle, badge: '3' },
  { path: '/contracts', label: 'Contracts', icon: FileText, badge: null },
  { path: '/revrec', label: 'Revenue Rec', icon: BarChart3, badge: null },
  { path: '/simulations', label: 'Simulations', icon: Sliders, badge: null },
  { path: '/exports', label: 'Exports & Audit', icon: Download, badge: null },
];

const settingsItems = [
  { path: '/settings/integrations', label: 'Integrations', icon: Link2 },
  { path: '/settings/snapshots', label: 'Snapshots', icon: Camera },
  { path: '/settings/jobs', label: 'Jobs', icon: List },
  { path: '/settings/audit', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="w-64 h-screen bg-black border-r border-zinc-900 flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6 pb-8">
        <Logo size={32} color="white" />
        <div className="ml-11 mt-1">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
            Revenue Command
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? 'text-white bg-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
                />
              )}
              <Icon size={18} className={isActive ? 'text-accent' : 'group-hover:text-zinc-400'} />
              {item.label}
              {item.badge && (
                <span className="ml-auto text-[10px] bg-[#ff6500]/20 text-[#ff6500] px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Settings section */}
        <div className="mt-6 mb-2">
          <div className="flex items-center gap-2 px-4 text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
            <Settings size={12} />
            Settings
          </div>
        </div>
        {settingsItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-white bg-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-accent' : 'group-hover:text-zinc-400'} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950">
        {user && (
          <div className="mb-3">
            <div className="text-sm text-white font-medium">{user.name}</div>
            <div className="text-xs text-zinc-500">{user.email}</div>
            <div className="text-[10px] uppercase text-accent mt-1">{user.role}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}

