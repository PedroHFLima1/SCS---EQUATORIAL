'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Moon, Sun, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { role, user, loading: authLoading } = useAuth();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      if (role === 'ADMINISTRADOR') {
        router.push('/dashboard/admin');
      } else if (role === 'PARCEIRO') {
        router.push('/dashboard/parceira');
      } else {
        router.push('/dashboard/travessia');
      }
    }
  }, [user, role, authLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
      // The redirect will be handled by the useEffect watching `user` and `role`
    } catch (err) {
      setError('Ocorreu um erro inesperado. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
      {/* Left Side - Image */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2000&auto=format&fit=crop"
          alt="Torre de Transmissão de Energia"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-12">
          <h2 className="text-3xl font-bold text-white mb-2">Energia que move o futuro</h2>
          <p className="text-lg font-medium text-gray-200">Excelência em infraestrutura e distribuição.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-24">
        {mounted && (
          <div className="absolute right-8 top-8 flex items-center space-x-2 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 transition-colors">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </span>
            <div 
              onClick={toggleTheme}
              className={`flex h-6 w-10 cursor-pointer items-center rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            {theme === 'dark' ? <Moon className="h-4 w-4 text-gray-400" /> : <Sun className="h-4 w-4 text-gray-500" />}
          </div>
        )}

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center text-4xl font-bold">
            <span className="text-yellow-500">SCS</span>
            <span className="ml-2 text-gray-800 dark:text-gray-100 font-light">Equatorial</span>
          </div>

          <h1 className="mb-2 text-3xl font-semibold text-gray-900 dark:text-white">Acesso Corporativo</h1>
          <p className="mb-8 text-gray-600 dark:text-gray-400">Acesso seguro ao sistema de controle de projetos SCS.</p>

          <form onSubmit={handleSignIn} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Erro ao fazer login
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{error === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-200">
                Endereço de E-mail Corporativo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-blue-50/50 dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                required
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Domínios aceitos: @equatorialenergia.com.br, @applus.com ou @afaplan.com
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-200">Senha</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 text-right">
                <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Esqueceu a Senha?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center rounded-md bg-[#0056b3] dark:bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 dark:hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
