'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

type Role = 'ADMINISTRADOR' | 'GESTOR_TRAVESSIA' | 'GESTOR_AMBIENTAL' | 'GESTOR_ANUENCIA' | 'PARCEIRO' | 'CONCESSIONARIA';

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
  const [role, setRoleState] = useState<Role>('PARCEIRO');
  const [email, setEmailState] = useState<string>('');
  const [name, setNameState] = useState<string>('');
  const [company, setCompanyState] = useState<string>('');

  useEffect(() => {
    // Check active sessions and sets the user
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

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setEmailState(session.user.email || '');
        fetchProfile(session.user.id);
      } else {
        setRoleState('PARCEIRO');
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
        console.error('Error fetching profile:', error);
        // Fallback role if profile not found
        setRoleState('PARCEIRO');
      } else if (data) {
        setNameState(data.name || '');
        setCompanyState(data.company || '');
        // Map database profile to app role
        if (data.profile === 'ADMIN') setRoleState('ADMINISTRADOR');
        else if (data.profile === 'CONCESSIONARIA') setRoleState('CONCESSIONARIA');
        else setRoleState('PARCEIRO');
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
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

  const isAdmin = role === 'ADMINISTRADOR';

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
