import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ClipboardList, Image, Tag, ListChecks, LogOut, Printer, Ticket, ShoppingBag, Settings, Palette } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const navItems = [
  { path: '/restaurant', icon: LayoutDashboard, label: 'DASHBOARD' },
  { path: '/restaurant/menu', icon: UtensilsCrossed, label: 'MENU' },
  { path: '/restaurant/orders', icon: ClipboardList, label: 'ORDINI' },
  { path: '/restaurant/banners', icon: Image, label: 'BANNER' },
  { path: '/restaurant/categories', icon: Tag, label: 'CATEGORIE' },
  { path: '/restaurant/choice-groups', icon: ListChecks, label: 'SCELTE' },
  { path: '/restaurant/printer', icon: Printer, label: 'STAMPANTE' },
  { path: '/restaurant/coupons', icon: Ticket, label: 'COUPON' },
  { path: '/restaurant/cross-selling', icon: ShoppingBag, label: 'CROSS-SELLING' },
  { path: '/restaurant/settings', icon: Settings, label: 'SETTINGS' },
  { path: '/restaurant/receipt-designer', icon: Palette, label: 'SCONTRINO' },
];

export default function RestaurantLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 bg-black border-r border-border flex-col">
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69cfa945a182b6ae303e88a8/dc4cad41d_Senzatitolo-2.png" alt="Crispy Parma" className="w-28" />
            <div>
              <p className="font-display font-black text-base uppercase tracking-wider text-white leading-none">Crispy Parma</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Ristorante</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-black uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-secondary hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-sm text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-4 h-4" />
            ESCI
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b-2 border-primary bg-black" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
          <span className="font-display font-black text-lg uppercase tracking-wider text-white">
            <span className="text-primary">G</span>USTO<span className="text-primary">·</span>PANEL
          </span>
          <div className="flex gap-1">
            {navItems.map(({ path, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path} className={`p-2 rounded-sm transition-all ${isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'}`}>
                  <Icon className="w-4 h-4" />
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}