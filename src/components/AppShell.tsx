import { Database, FlaskConical, History, Moon, Settings, Sun, Target, Trash2, Zap } from 'lucide-react';
import React from 'react';

type Theme = 'light' | 'dark';
type Tab = 'dashboard' | 'inventory' | 'settings' | 'activity' | 'data' | 'research';

type AppShellProps = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  backendIsHealthy: boolean;
  isHealthLoading: boolean;
  activeCatalogLabel: string;
  activeCatalogTimestamp: string;
  onLogout: () => void;
  children: React.ReactNode;
};

export function AppShell({
  theme,
  setTheme,
  activeTab,
  setActiveTab,
  backendIsHealthy,
  isHealthLoading,
  activeCatalogLabel,
  activeCatalogTimestamp,
  onLogout,
  children,
}: AppShellProps) {
  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-blue-500/30 overflow-hidden transition-colors duration-300`}>
      <div className="flex h-full">
        <aside className="w-64 border-r border-[var(--border)] p-6 flex flex-col gap-8 bg-[var(--bg-secondary)] transition-colors duration-300">
          <div className="flex items-center justify-between px-2">
            <span className="font-heading font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-h)] to-gray-500">FluxPricing</span>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 hover:bg-[var(--border)] rounded-xl text-[var(--text)] transition-all"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'dashboard' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Zap size={16} className={`${activeTab === 'dashboard' ? 'text-blue-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'inventory' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Target size={16} className={`${activeTab === 'inventory' ? 'text-blue-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Inventory</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'settings' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Settings size={16} className={`${activeTab === 'settings' ? 'text-amber-400' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Config</span>
            </button>
            <button onClick={() => setActiveTab('research')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'research' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <FlaskConical size={16} className={`${activeTab === 'research' ? 'text-purple-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Research</span>
            </button>
            <button onClick={() => setActiveTab('activity')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'activity' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <History size={16} className={`${activeTab === 'activity' ? 'text-blue-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Activity</span>
            </button>
            <button onClick={() => setActiveTab('data')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'data' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Database size={16} className={`${activeTab === 'data' ? 'text-emerald-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Data History</span>
            </button>
          </nav>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border border-transparent text-[var(--text)] hover:text-rose-500 hover:bg-rose-500/10 mt-2 cursor-pointer w-full text-left group"
          >
            <Trash2 size={16} className="text-[var(--text)] group-hover:text-rose-500" />
            <span className="font-bold text-sm">Logout</span>
          </button>

          <div className="mt-auto p-4 bg-gradient-to-br from-blue-900/20 to-blue-900/20 rounded-2xl border border-blue-500/10">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">System Status</p>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className={`w-2 h-2 rounded-full shrink-0 ${isHealthLoading ? 'bg-amber-400 animate-pulse' : backendIsHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                {isHealthLoading ? 'Checking backend...' : backendIsHealthy ? 'Engine Active' : 'Backend Unreachable'}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-500/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Active Catalog</p>
              <p className="text-sm text-slate-600 dark:text-gray-300 font-semibold break-all">{activeCatalogLabel}</p>
              {activeCatalogTimestamp && <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 font-mono">uploaded {activeCatalogTimestamp}</p>}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-10 relative custom-scrollbar bg-[var(--bg)]">
          {children}
        </main>
      </div>
    </div>
  );
}
