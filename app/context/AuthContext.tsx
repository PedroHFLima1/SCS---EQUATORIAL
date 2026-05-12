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
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        setEmailState(session.user.email || '');
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        setEmailState(session.user.email || '');
        fetchProfile(session.user.id);
      } else {
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
        // Log melhorado para identificar bloqueios de RLS na API
        console.error('SUPABASE API ERROR - Falha ao ler o perfil:', error.message, error.details);
        setRoleState('PARCEIRA');
      } else if (data) {
        setNameState(data.name || '');
        setCompanyState(data.company || '');
        
        // Tratamento de segurança: Força maiúsculo para evitar falha na verificação
        const safeProfile = (data.profile || '').toUpperCase();
        
        if (safeProfile === 'ADMIN') {
          setRoleState('ADMIN');
        } else if (safeProfile === 'GESTOR') {
          const comp = (data.company || '').toLowerCase();
          if (comp.includes('ambiental')) setRoleState('GESTOR_AMBIENTAL');
          else if (comp.includes('anuência') || comp.includes('anuencia')) setRoleState('GESTOR_ANUENCIA');
          else setRoleState('GESTOR_TRAVESSIA'); 
        } else {
          setRoleState('PARCEIRA');
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
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

  const isAdmin = role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ role, setRole, email, setEmail, name, company, isAdmin, user, loading }}>
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
