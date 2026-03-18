'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Route, Leaf, FileText, Users, Moon, Sun, ShieldAlert, Settings, Menu, X, Briefcase, Mail, Bell, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { NotificationBell } from '@/components/NotificationBell';

function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { role, setRole, isAdmin, email, setEmail, name, company } = useAuth();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const navItems = [
    { name: 'TRAVESSIA', href: '/dashboard/travessia', icon: Route, section: 'MÓDULOS', allowedRoles: ['ADMIN', 'GESTOR_TRAVESSIA'] },
    { name: 'AMBIENTAL', href: '#', icon: Leaf, badge: 'EM DEV', section: 'MÓDULOS', allowedRoles: ['ADMIN', 'GESTOR_AMBIENTAL'] },
    { name: 'ANUÊNCIA', href: '#', icon: FileText, badge: 'EM DEV', section: 'MÓDULOS', allowedRoles: ['ADMIN', 'GESTOR_ANUENCIA'] },
    { name: 'PAINEL PARCEIRA', href: '/dashboard/parceira', icon: Briefcase, section: 'OPERAÇÃO', allowedRoles: ['PARCEIRA'] },
    { name: 'PAINEL ADMIN', href: '/dashboard/admin', icon: Settings, section: 'CONFIGURAÇÕES', allowedRoles: ['ADMIN'] },
  ];

  const visibleNavItems = navItems.filter(item => item.allowedRoles.includes(role));

  // Close mobile menu when route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-200 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-[#111827] dark:bg-gray-900 text-white p-4 absolute top-0 w-full z-30 border-b border-gray-800">
        <div className="flex items-center">
          <span className="text-xl font-bold text-yellow-500">SCS</span>
          <span className="ml-2 text-sm font-light">Equatorial</span>
        </div>
        <div className="flex items-center space-x-2">
          <NotificationBell />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 hover:bg-gray-800 rounded-md transition-colors">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out bg-[#111827] dark:bg-gray-900 text-white flex flex-col border-r border-transparent dark:border-gray-800`}>
        <div className="hidden md:flex h-16 items-center justify-between px-6">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-yellow-500">SCS</span>
            <span className="ml-2 text-lg font-light">Equatorial</span>
          </div>
          <NotificationBell />
        </div>

        {/* Role Simulator Removed */}

        <div className="mt-6 flex-1 flex flex-col space-y-6 overflow-y-auto">
          {/* Módulos */}
          <div>
            <div className="px-6 text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">
              Módulos
            </div>
            <nav className="space-y-1">
              {visibleNavItems.filter(item => item.section === 'MÓDULOS').map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-800 dark:bg-gray-800/50 text-white border-l-4 border-yellow-500'
                        : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-800/50 hover:text-white border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-yellow-500' : 'text-gray-400'}`} />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="rounded bg-red-900/50 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Operação */}
          {visibleNavItems.filter(item => item.section === 'OPERAÇÃO').length > 0 && (
            <div>
              <div className="px-6 text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">
                Operação
              </div>
              <nav className="space-y-1">
                {visibleNavItems.filter(item => item.section === 'OPERAÇÃO').map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-800 dark:bg-gray-800/50 text-white border-l-4 border-emerald-500'
                          : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-800/50 hover:text-white border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center">
                        <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-emerald-500' : 'text-gray-400'}`} />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Configurações */}
          {visibleNavItems.filter(item => item.section === 'CONFIGURAÇÕES').length > 0 && (
            <div>
              <div className="px-6 text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">
                Configurações
              </div>
              <nav className="space-y-1">
                {visibleNavItems.filter(item => item.section === 'CONFIGURAÇÕES').map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-800 dark:bg-gray-800/50 text-white border-l-4 border-blue-500'
                          : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-800/50 hover:text-white border-l-4 border-transparent'
                      }`}
                    >
                      <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Theme Toggle and Sign Out in Sidebar */}
        {mounted && (
          <div className="p-4 border-t border-gray-800 mt-auto space-y-4">
            {/* User Profile */}
            <div className="flex items-center space-x-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-white">
                  {name || 'Usuário'}
                </span>
                <span className="truncate text-xs text-gray-400">
                  {company || role}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex w-full items-center justify-center space-x-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4" />
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    <span>Modo Escuro</span>
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setEmail('');
                  router.push('/');
                }}
                className="flex w-full items-center justify-center space-x-2 rounded-md bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto text-gray-900 dark:text-gray-100 pt-16 md:pt-0">
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardSidebar>{children}</DashboardSidebar>
  );
}
