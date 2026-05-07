'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotifications, Notification } from '@/app/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 md:left-0 md:right-auto mt-2 w-80 sm:w-96 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 z-50 origin-top-right md:origin-top-left"
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-wider"
                >
                  Lidas
                </button>
                <button 
                  onClick={clearNotifications}
                  className="text-[10px] font-medium text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 uppercase tracking-wider"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Nenhuma notificação por aqui.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Fique tranquilo, avisaremos quando algo mudar.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`group relative flex items-start space-x-3 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.processId && (
                          <div className="mt-2 flex items-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Processo: {notification.processId}
                          </div>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800/50 text-center">
                <button className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 uppercase tracking-widest">
                  Ver Todas
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
