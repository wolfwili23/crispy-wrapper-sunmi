import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Truck, ClipboardList, User, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const navItems = [
  { path: '/driver', icon: Truck, label: 'CONSEGNE' },
  { path: '/driver/history', icon: ClipboardList, label: 'STORICO' },
  { path: '/driver/profile', icon: User, label: 'PROFILO' },
];

export default function DriverLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-black border-b-2 border-primary px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        <span className="font-display font-black text-xl uppercase tracking-wider text-white">
          🛵 <span className="text-primary">DRIVER</span>
        </span>
        <button
          onClick={() => base44.auth.logout()}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 pb-20 overflow-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-2 border-primary z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto flex justify-around items-center h-16">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 flex-1 relative transition-all ${
                  isActive ? 'text-primary' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[9px] font-bold tracking-widest">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}