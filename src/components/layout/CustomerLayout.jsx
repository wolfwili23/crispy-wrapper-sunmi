import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CouponInput from '@/components/checkout/CouponInput';
import { base44 } from '@/api/base44Client';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Clock, ShoppingBag, User, UtensilsCrossed, ArrowLeft, Home } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const navItems = [
{ path: '/', icon: Home, label: 'MENU' },
{ path: '/orders', icon: Clock, label: 'ORDINI' },
{ path: '/cart', icon: ShoppingBag, label: 'CARRELLO' },
{ path: '/profile', icon: User, label: 'PROFILO' }];


export default function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const scrollPositions = React.useRef({});

  // Save scroll on location change, restore on arrive
  React.useEffect(() => {
    const saved = scrollPositions.current[location.pathname];
    window.scrollTo(0, saved ?? 0);
    return () => {
      scrollPositions.current[location.pathname] = window.scrollY;
    };
  }, [location.pathname]);

  const ROOT_PATHS = ['/', '/orders', '/cart', '/profile'];
  const isRootPath = ROOT_PATHS.includes(location.pathname);

  const handleNav = (path) => {
    if (location.pathname === path) return; // already on root tab, do nothing
    scrollPositions.current[location.pathname] = window.scrollY;
    navigate(path);
  };
  const [couponOpen, setCouponOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    base44.auth.me().then((u) => setUserEmail(u.email)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back button bar — visible only on child screens */}
      {!isRootPath &&
      <div
        className="sticky top-0 z-40 flex items-center gap-2 px-3 bg-black/90 backdrop-blur border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(2.75rem + env(safe-area-inset-top))' }}>
        
          <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors py-2 pr-3">
          
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Indietro</span>
          </button>
        </div>
      }
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-2 border-primary z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto flex justify-around items-center h-16">

          <Link to="/" className="flex flex-col items-center justify-center flex-1">
            <img
              src="https://media.base44.com/images/public/69cfa945a182b6ae303e88a8/8c2c6c799_Senzatitolo-2.png"
              alt="Crispy"
              className="h-10 w-auto object-contain" />
            
          </Link>

          <button onClick={() => handleNav('/')} className={`flex flex-col items-center gap-0.5 px-4 py-2 flex-1 relative transition-all ${location.pathname === '/' ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}>
            {location.pathname === '/' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
            <UtensilsCrossed className="w-5 h-5" strokeWidth={location.pathname === '/' ? 2.5 : 1.5} />
            <span className="text-[9px] font-bold tracking-widest">MENU</span>
          </button>

          <button onClick={() => handleNav('/orders')} className={`flex flex-col items-center gap-0.5 px-4 py-2 flex-1 relative transition-all ${location.pathname === '/orders' ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}>
            {location.pathname === '/orders' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
            <Clock className="w-5 h-5" strokeWidth={location.pathname === '/orders' ? 2.5 : 1.5} />
            <span className="text-[9px] font-bold tracking-widest">ORDINI</span>
          </button>

          


          

          <button onClick={() => handleNav('/cart')} className={`flex flex-col items-center gap-0.5 px-4 py-2 flex-1 relative transition-all ${location.pathname === '/cart' ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}>
            {location.pathname === '/cart' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
            <div className="relative">
              <ShoppingBag className="w-5 h-5" strokeWidth={location.pathname === '/cart' ? 2.5 : 1.5} />
              {itemCount > 0 &&
              <span className="absolute -top-2 -right-3 bg-primary text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{itemCount}</span>
              }
            </div>
            <span className="text-[9px] font-bold tracking-widest">CARRELLO</span>
          </button>

          <button onClick={() => handleNav('/profile')} className={`flex flex-col items-center gap-0.5 px-4 py-2 flex-1 relative transition-all ${location.pathname === '/profile' ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}>
            {location.pathname === '/profile' && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
            <User className="w-5 h-5" strokeWidth={location.pathname === '/profile' ? 2.5 : 1.5} />
            <span className="text-[9px] font-bold tracking-widest">PROFILO</span>
          </button>

        </div>
      </nav>

      <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest">🎟 Inserisci Coupon</DialogTitle>
          </DialogHeader>
          <CouponInput
            userEmail={userEmail}
            cartTotal={0}
            onApply={(coupon, discount) => {setAppliedCoupon(coupon);if (coupon) setCouponOpen(false);}}
            appliedCoupon={appliedCoupon} />
          
          {appliedCoupon &&
          <p className="text-xs text-muted-foreground text-center">Il coupon verrà applicato automaticamente al checkout.</p>
          }
        </DialogContent>
      </Dialog>
    </div>);

}