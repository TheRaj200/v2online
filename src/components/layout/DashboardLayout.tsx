import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppSelector } from '../../store/hooks';
import {
  Menu,
  Home,
  Wallet,
  User,
  Headphones,
  Shield,
  LogOut,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserX,
  Store,
  Layers,
  Users,
  UserCog,
  Percent,
  FileCheck,
  X
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  roleBadge?: string;
  badgeColor?: string;
  activeMenu?: string;
}

interface SubMenuItem {
  name: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

interface MenuItem {
  name: string;
  icon: React.ElementType;
  path?: string;
  color: string;
  badge?: string;
  hasSub?: boolean;
  subItems?: SubMenuItem[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  // Live wallet balance (Redux) — recharge / application ke baad turant update hota hai
  const walletStatus = useAppSelector(s => s.wallet.status);
  const walletBalance = useAppSelector(s => s.wallet.balance);
  const headerBalance = walletStatus === 'succeeded' ? walletBalance : Number(user?.wallet_balance || 0);
  
  // Responsive sidebar state: open by default on desktop (>=768px), closed on mobile (<768px)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  // Auto-close sidebar drawer on mobile route change
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Sync sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getRoleDisplayName = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'Admin';
      case 'sub_admin':
        return 'Sub Admin';
      case 'manager':
        return 'Manager';
      case 'distributor':
        return 'Distributor';
      case 'operator':
        return 'Operator';
      case 'agent':
      default:
        return 'Retailer';
    }
  };

  const getMenuItems = (): MenuItem[] => {
    if (user?.role === 'distributor') {
      return [
        { name: 'Dashboard', icon: Home, path: '/distributor/dashboard', color: 'text-blue-600' },
        { name: 'Shop Management', icon: UserCheck, path: '/distributor/verify-shops', color: 'text-amber-600' },
        { name: 'Delete Shop Requests', icon: UserX, path: '/distributor/delete-shop-requests', color: 'text-red-500' },
        { name: 'Complaint', icon: Headphones, path: '/distributor/complaint', color: 'text-red-600' },
        { name: 'My Profile', icon: User, path: '/distributor/profile', color: 'text-purple-600' }
      ];
    }

    if (user?.role === 'operator') {
      return [
        { name: 'Dashboard', icon: Home, path: '/operator/dashboard', color: 'text-blue-600' },
        { name: 'Service Requests', icon: Layers, path: '/operator/service-requests', color: 'text-indigo-600' },
        { name: 'Wallet Management', icon: Wallet, path: '/operator/wallet', color: 'text-emerald-600' },
        { name: 'Complaint', icon: Headphones, path: '/operator/complaint', color: 'text-red-600' },
        { name: 'My Profile', icon: User, path: '/operator/profile', color: 'text-purple-600' }
      ];
    }

    if (user?.role === 'manager') {
      return [
        { name: 'Dashboard', icon: Home, path: '/manager/dashboard', color: 'text-blue-600' },
        { name: 'Services Management', icon: Layers, path: '/manager/services', color: 'text-violet-600' },
        { name: 'Shop Management', icon: Store, path: '/manager/shops', color: 'text-blue-600' },
        { name: 'Operator Management', icon: UserCheck, path: '/manager/operators', color: 'text-teal-600' },
        { name: 'Task Verification', icon: UserCheck, path: '/manager/task-verification', color: 'text-indigo-600' },
        { name: 'Operator Withdrawal Request', icon: Wallet, path: '/manager/withdrawal-requests', color: 'text-emerald-600' },
        { name: 'Complaint', icon: Headphones, path: '/manager/complaints', color: 'text-red-600' },
        { name: 'My Profile', icon: User, path: '/manager/profile', color: 'text-purple-600' }
      ];
    }

    if (user?.role === 'super_admin' || user?.role === 'sub_admin') {
      const basePath = '/admin';
      return [
        { name: 'Dashboard', icon: Home, path: `${basePath}/dashboard`, color: 'text-blue-600' },
        {
          name: 'User Management',
          icon: Users,
          color: 'text-indigo-600',
          subItems: [
            { name: 'Shop Management', icon: Store, path: `${basePath}/shops`, color: 'text-blue-600' },
            { name: 'Operator Management', icon: UserCheck, path: `${basePath}/operators`, color: 'text-teal-600' },
            { name: 'Staff Management', icon: UserCog, path: `${basePath}/users`, color: 'text-indigo-600' }
          ]
        },
        { name: 'Services Management', icon: Layers, path: `${basePath}/services`, color: 'text-violet-600' },
        { name: 'Commission Reports', icon: Percent, path: `${basePath}/commissions`, color: 'text-emerald-600' },
        { name: 'Task Verification', icon: UserCheck, path: `${basePath}/task-verification`, color: 'text-indigo-600' },
        { name: 'Operator Withdrawal Request', icon: Wallet, path: `${basePath}/withdrawal-requests`, color: 'text-teal-600' },
        { name: 'Wallet Management', icon: Wallet, path: `${basePath}/wallet`, color: 'text-emerald-600' },
        { name: 'Complaint', icon: Headphones, path: `${basePath}/complaints`, color: 'text-red-600' },
        { name: 'My Profile', icon: User, path: `${basePath}/profile`, color: 'text-purple-600' }
      ];
    }

    return [
      { name: 'Dashboard', icon: Home, path: '/agent/dashboard', color: 'text-blue-600' },
      { name: 'Services', icon: Layers, path: '/agent/services', color: 'text-indigo-600' },
      { name: 'Applied Services', icon: FileCheck, path: '/agent/my-requests', color: 'text-blue-600' },
      { name: 'Wallet Manage', icon: Wallet, path: '/agent/wallet', color: 'text-emerald-600' },
      { name: 'Complaint', icon: Headphones, path: '/agent/complaint', color: 'text-red-600' },
      { name: 'My Profile', icon: User, path: '/agent/profile', color: 'text-purple-600' },
      { name: 'Terms & Policies', icon: Shield, path: '/agent/terms', color: 'text-blue-500' }
    ];
  };

  const getProfilePath = () => {
    if (user?.role === 'super_admin' || user?.role === 'sub_admin') return '/admin/profile';
    if (user?.role === 'manager') return '/manager/profile';
    if (user?.role === 'operator') return '/operator/profile';
    if (user?.role === 'distributor') return '/distributor/profile';
    return '/agent/profile';
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans flex flex-col">
      
      {/* 1. Top Sticky Brand Navbar Header */}
      <header className="sticky top-0 z-40 bg-[#1565c0] text-white shadow-md px-3 sm:px-5 py-2.5 flex items-center justify-between h-14">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="p-1.5 rounded-lg text-white hover:bg-white/15 transition-colors focus:outline-none cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Glowing Emblem Icon */}
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400 rounded-xl blur-xs opacity-80 group-hover:opacity-100 transition duration-300" />
              <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-950 border border-white/20 flex items-center justify-center shadow-lg">
                <span className="text-xs sm:text-sm font-black bg-gradient-to-br from-amber-300 via-orange-400 to-emerald-300 bg-clip-text text-transparent tracking-tighter">
                  V2
                </span>
              </div>
            </div>

            {/* Text Brand */}
            <div className="leading-none select-none">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-sm">
                  V2
                </span>
                <span className="text-base sm:text-lg font-black tracking-wider bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200 bg-clip-text text-transparent uppercase drop-shadow-xs">
                  ONLINE
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 bg-white/15 text-amber-300 text-[8px] sm:text-[9px] font-extrabold tracking-widest px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-xs uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SERVICES PORTAL</span>
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right: User Profile Avatar & Retailer Wallet */}
        <div className="flex items-center gap-2 sm:gap-3">
          {(!user?.role || user?.role === 'agent') && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-inner">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-mono text-emerald-400 font-extrabold">₹{headerBalance.toFixed(0)}</span>
            </div>
          )}

          {/* User Profile Avatar Link */}
          <Link
            to={getProfilePath()}
            className="flex items-center gap-2 pl-1 sm:pl-2 hover:opacity-85 transition-opacity cursor-pointer"
            title="View My Profile"
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold border border-white/40 shadow-xs">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block text-left leading-none">
              <p className="text-xs font-bold text-white truncate max-w-[120px]">{user?.full_name || 'Retailer'}</p>
              <p className="text-[10px] text-blue-200 font-medium mt-0.5">{getRoleDisplayName()}</p>
            </div>
          </Link>
        </div>
      </header>

      {/* 2. Main Body with Sticky Sidebar & Scrollable Content */}
      <div className="flex flex-1 min-h-[calc(100vh-56px)] relative">
        
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          />
        )}

        {/* Sticky Desktop & Slide-in Mobile Sidebar */}
        <aside
          className={`
            fixed md:sticky top-14 left-0 z-50 md:z-30
            h-[calc(100vh-56px)] 
            ${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'}
            bg-white border-r border-slate-200
            transition-all duration-300 ease-in-out
            flex flex-col justify-between shrink-0 select-none shadow-xl md:shadow-none
          `}
        >
          {/* Mobile Close Bar */}
          <div className="md:hidden flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Navigation Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Navigation Menu Items */}
          <div className="p-2.5 flex-1 overflow-y-auto space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;

              // Handle subItems (Accordion)
              if (item.subItems) {
                const isAnyChildActive = item.subItems.some(sub => location.pathname === sub.path);
                const isMenuOpen = openSubMenus[item.name] !== undefined ? openSubMenus[item.name] : isAnyChildActive;

                const handleToggleMenu = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenSubMenus(prev => ({
                    ...prev,
                    [item.name]: !isMenuOpen
                  }));
                };

                return (
                  <div key={item.name} className="flex flex-col">
                    <button
                      type="button"
                      onClick={handleToggleMenu}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer text-left ${
                        isAnyChildActive
                          ? 'text-[#1565c0] font-bold bg-blue-50/90 border-l-4 border-[#1565c0] rounded-l-none'
                          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0 ${isAnyChildActive ? 'text-[#1565c0]' : item.color}`} />
                        {sidebarOpen && <span className="truncate">{item.name}</span>}
                      </div>

                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                            isMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>

                    {/* Sub Menu Dropdown items */}
                    {sidebarOpen && isMenuOpen && (
                      <div className="bg-slate-50/90 border-y border-slate-100 my-1 py-1 px-1 rounded-xl space-y-0.5">
                        {item.subItems.map(sub => {
                          const isChildActive = location.pathname === sub.path;
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              onClick={() => {
                                if (window.innerWidth < 768) setSidebarOpen(false);
                              }}
                              className={`flex items-center gap-2.5 pl-8 pr-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                isChildActive
                                  ? 'text-[#1565c0] font-bold bg-blue-100/80 border-l-2 border-[#1565c0]'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              <SubIcon className={`h-4 w-4 shrink-0 ${isChildActive ? 'text-[#1565c0]' : sub.color}`} />
                              <span className="truncate">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = item.path ? location.pathname === item.path || (index === 0 && location.pathname.includes('dashboard')) : false;

              return (
                <Link
                  key={item.name}
                  to={item.path || '#'}
                  onClick={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'text-[#1565c0] font-bold bg-blue-50/90 border-l-4 border-[#1565c0] rounded-l-none'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0 ${isActive ? 'text-[#1565c0]' : item.color}`} />
                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                  </div>

                  {sidebarOpen && item.badge && (
                    <div className="flex items-center gap-1">
                      <span className="bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] text-[10px] font-bold px-1.5 py-0.2 rounded">
                        {item.badge}
                      </span>
                      {item.hasSub && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                  )}

                  {sidebarOpen && item.hasSub && !item.badge && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sticky Bottom Footer: Logout */}
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/80 shrink-0">
            <button
              onClick={logout}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl border border-rose-200/80 transition-all duration-200 group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-rose-600 group-hover:text-white transition-colors shrink-0" />
                {sidebarOpen && <span>Logout</span>}
              </div>
              {sidebarOpen && <ChevronRight className="h-4 w-4 text-rose-400 group-hover:text-white transition-colors" />}
            </button>
          </div>
        </aside>

        {/* Main Content View */}
        <main className="flex-1 w-full min-w-0 p-3 sm:p-5 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
