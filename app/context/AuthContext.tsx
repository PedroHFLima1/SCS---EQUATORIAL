'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

type Role = 'ADMIN' | 'GESTOR_TRAVESSIA' | 'GESTOR_AMBIENTAL' | 'GESTOR_ANUENCIA' | 'PARCEIRA';

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  email: string;
  setEmail: (email: string) => void;
  name: string;
  company: string;
  isAdmin: boolean;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<Role>('PARCEIRA');
  const [email, setEmailState] = useState<string>('');
  const [name, setNameState] = useState<string>('');
  const [company, setCompanyState] = useState<string>('');

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          setEmailState(session.user.email || '');
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setLoading(true);
        setUser(session.user);
        setEmailState(session.user.email || '');
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setRoleState('PARCEIRA');
        setEmailState('');
        setNameState('');
        setCompanyState('');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile, name, company')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Falha ao ler Supabase:', error);
        setRoleState('PARCEIRA');
        return;
      }

      if (data) {
        setNameState(data.name || '');
        setCompanyState(data.company || '');
        
        const rawProfile = String(data.profile || '').toUpperCase().trim();
        
        if (rawProfile === 'ADMIN') {
          setRoleState('ADMIN');
        } else if (rawProfile === 'GESTOR') {
          const comp = String(data.company || '').toLowerCase().trim();
          if (comp.includes('ambiental')) setRoleState('GESTOR_AMBIENTAL');
          else if (comp.includes('anuência') || comp.includes('anuencia')) setRoleState('GESTOR_ANUENCIA');
          else setRoleState('GESTOR_TRAVESSIA'); 
        } else {
          setRoleState('PARCEIRA');
        }
      }
    } catch (err) {
      setRoleState('PARCEIRA');
    } finally {
      setLoading(false);
    }
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
  };

  const setEmail = (newEmail: string) => {
    setEmailState(newEmail);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        role, 
        setRole, 
        email, 
        setEmail, 
        name, 
        company, 
        isAdmin: role === 'ADMIN', 
        user, 
        loading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
