import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, ArrowLeftRight, ShieldAlert, ScanLine, Lightbulb, LogOut, Menu, X, Wallet, ChevronRight, Trophy } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/anomaly', icon: ShieldAlert, label: 'Anomaly Detection' },
  { to: '/scanner', icon: ScanLine, label: 'Receipt Scanner' },
  { to: '/insights', icon: Lightbulb, label: 'Insights' },
  { to: '/rewards', icon: Trophy, label: 'Rewards & Theme' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { activeStyle, isLight } = useTheme(); 

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    // MEMAKAI BACKGROUND UTAMA DARI TEMA
    <div className={clsx("min-h-screen flex transition-colors duration-500", activeStyle.mainBg)}>
      
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MEMAKAI BACKGROUND SIDEBAR DARI TEMA */}
      <aside className={clsx(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 border-r flex flex-col transition-all duration-500 ease-out lg:translate-x-0",
        activeStyle.sidebarBg,
        isLight ? "border-pink-200" : "border-white/5", // Pakai border tipis putih biar cocok di semua warna gelap
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className={clsx("p-6 flex items-center gap-3 border-b", isLight ? "border-pink-100" : "border-white/5")}>
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500", activeStyle.solidBg, activeStyle.logoGlow)}>
            <Wallet className={clsx("w-5 h-5", activeStyle.solidText)} />
          </div>
          <div>
            <h1 className={clsx("text-lg font-bold tracking-tight transition-colors duration-500", isLight ? "text-slate-800" : "text-white")}>SmartBudget</h1>
            <p className={clsx("text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors duration-500", activeStyle.text)}>Gen Z Fintech</p>
          </div>
          <button className={clsx("ml-auto lg:hidden transition-colors", isLight ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-white")} onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group border',
                  isActive
                    ? `${activeStyle.bg} ${activeStyle.text} ${activeStyle.border}` 
                    : isLight 
                      ? 'text-slate-600 hover:text-pink-600 hover:bg-pink-50 border-transparent'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                )}
              >
                <item.icon className={clsx('w-5 h-5 transition-transform duration-300 group-hover:scale-110', isActive && activeStyle.text)} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className={clsx("w-3.5 h-3.5 opacity-50", activeStyle.text)} />}
              </NavLink>
            );
          })}
        </nav>

        <div className={clsx("p-4 border-t", isLight ? "border-pink-100" : "border-white/5")}>
          <div className="flex items-center gap-3 px-4 py-2 mb-3">
            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-colors duration-500", activeStyle.solidBg, activeStyle.solidText, activeStyle.logoGlow)}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx("text-sm truncate transition-colors duration-500", isLight ? "text-slate-700" : "text-white")}>{user?.email || 'User'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full group",
            isLight ? "text-slate-500 hover:text-rose-500 hover:bg-rose-50" : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          )}>
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* MEMAKAI BACKGROUND HEADER DARI TEMA */}
        <header className={clsx(
          "sticky top-0 z-30 backdrop-blur-xl border-b px-4 lg:px-8 py-4 flex items-center gap-4 transition-colors duration-500",
          activeStyle.headerBg,
          isLight ? "border-pink-100" : "border-white/5"
        )}>
          <button className={clsx("lg:hidden transition-colors", isLight ? "text-slate-500" : "text-slate-400")} onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className={clsx("hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border", isLight ? "bg-white border-pink-200" : "bg-black/20 border-white/10")}>
              <span className={clsx("text-xs", isLight ? "text-slate-500" : "text-slate-400")}>API</span>
              <span className={clsx("text-xs font-medium transition-colors duration-500", activeStyle.text)}>REST</span>
            </div>
            <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-500", activeStyle.bg, activeStyle.border)}>
              <div className={clsx("w-2 h-2 rounded-full animate-pulse", activeStyle.solidBg)} />
              <span className={clsx("text-xs font-medium", activeStyle.text)}>Live</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}