import { useState } from 'react';
import { AlertCircle, BrainCircuit, Loader2, ShieldCheck, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Theme = 'light' | 'dark';

type LoginPageProps = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogin: (username: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
};

export function LoginPage({ theme, setTheme, onLogin, isLoading, error }: LoginPageProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} min-h-screen bg-[var(--bg)] flex items-center justify-center relative overflow-hidden font-sans p-6`}>
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-[var(--bg-secondary)]/50 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col gap-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <BrainCircuit size={32} className="animate-pulse" />
          </div>
          <h2 className="text-3xl font-heading font-extrabold text-[var(--text-h)] tracking-tight">FluxPricing Core</h2>
          <p className="text-[var(--text)] text-sm opacity-60 mt-1 font-medium">Autonomous Multi-Agent Orchestration Engine</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(usernameInput, passwordInput);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-heading font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest pl-1">Security Username</label>
            <input
              type="text"
              required
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter admin user identifier..."
              className="bg-black/5 dark:bg-black/20 border border-[var(--border)] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text-h)] transition-all placeholder:text-[var(--text)] placeholder:opacity-30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-heading font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest pl-1">Access Token / Password</label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password credential..."
              className="bg-black/5 dark:bg-black/20 border border-[var(--border)] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-[var(--text-h)] transition-all placeholder:text-[var(--text)] placeholder:opacity-30"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-500/10 text-rose-500 text-xs font-bold px-4 py-3 rounded-2xl border border-rose-500/20 flex items-center gap-2"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-blue-500/10 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Decrypting Ledger Keys...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Establish Secure Connection</span>
              </>
            )}
          </button>
        </form>

        <div className="flex justify-center border-t border-[var(--border)] pt-4 mt-2">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center gap-2 text-xs font-bold text-[var(--text)] opacity-70 hover:opacity-100 transition-all"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span>Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
