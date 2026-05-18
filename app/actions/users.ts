'use server';

import { createClient } from '@supabase/supabase-js';

// 1. BLINDAGEM DE TIPOS: Definindo os valores exatos permitidos no sistema
type UserProfileRole = 'ADMIN' | 'GESTOR' | 'PARCEIRA';
type UserStatus = 'Ativo' | 'Inativo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Variáveis de ambiente do Supabase não encontradas. O cliente admin não foi inicializado corretamente.');
}

// O Service Role Key tem poder absoluto e ignora as políticas de segurança (RLS). Use apenas no backend.
const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseServiceRoleKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function getUsers() {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada.' };
  }

  try {
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return { error: authError.message };
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');

    if (profilesError) {
      return { error: profilesError.message };
    }

    const usersWithProfiles = users
      .filter(user => profiles.some(p => p.id === user.id))
      .map(user => {
        const profile = profiles.find(p => p.id === user.id)!;
        return {
          id: user.id,
          email: user.email,
          name: profile.name || '',
          profile: (profile.profile as UserProfileRole) || '',
          company: profile.company || '',
          status: (profile.status as UserStatus) || 'Inativo',
          created_at: profile.created_at || user.created_at
        };
      });

    return { success: true, users: usersWithProfiles };
  } catch (err: any) {
    console.error('getUsers error:', err);
    return { error: err.message || 'Erro inesperado ao listar usuários.' };
  }
}

// A assinatura da função agora exige os tipos restritos
export async function createUser(data: { email: string; name: string; profile: UserProfileRole; company: string; password?: string }) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada (SUPABASE_SERVICE_ROLE_KEY).' };
  }

  try {
    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password || 'Password123!', // Senha temporária. É boa prática forçar o reset no primeiro login.
      email_confirm: true,
      user_metadata: {
        name: data.name,
        profile: data.profile,
        company: data.company
      }
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Erro ao criar usuário.' };
    }

    // 2. Update profile (apenas por garantia, mas o trigger já deve ter criado com os dados corretos)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name: data.name,
        profile: data.profile,
        company: data.company,
        status: 'Ativo'
      })
      .eq('id', authData.user.id);

    if (profileError) {
      // Rollback: se o perfil falhar, deletamos a conta de auth para não deixar dados órfãos
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: profileError.message };
    }

    return { success: true, user: authData.user };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao criar usuário.' };
  }
}

// Atualização também tipada
export async function updateUser(userId: string, data: { name: string; profile: UserProfileRole; company: string; password?: string }) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada.' };
  }

  try {
    if (data.password) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password
      });
      if (authError) {
        return { error: authError.message };
      }
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        name: data.name,
        profile: data.profile,
        company: data.company,
      })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao atualizar usuário.' };
  }
}

export async function deleteUser(userId: string) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada.' };
  }

  try {
    // 1. Delete from auth.users (this will cascade to profiles if ON DELETE CASCADE is set)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      return { error: authError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao excluir usuário.' };
  }
}

export async function toggleUserStatus(userId: string, currentStatus: UserStatus) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada.' };
  }

  const newStatus: UserStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';

  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    return { success: true, newStatus };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao alterar status do usuário.' };
  }
}

export async function requestPasswordReset(email: string, origin?: string) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada.' };
  }

  try {
    // 1. Find user by email
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, last_password_reset')
      .eq('email', email)
      .single();

    if (profileError || !profiles) {
      return { error: 'Usuário não encontrado.' };
    }

    // 2. Use origin if provided, else fallback
    const siteUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://ais-dev-eigsujcpqbfctefw4sbxuo-163080127208.us-east1.run.app';

    // 3. Send reset email
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (resetError) {
      return { error: resetError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao solicitar redefinição de senha.' };
  }
}

export async function resetUserPassword(userId: string) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada.' };
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: 'Password123!',
    });

    if (error) {
      return { error: error.message };
    }

    // Update last_password_reset in profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ last_password_reset: new Date().toISOString() })
      .eq('id', userId);

    if (profileError) {
      console.error('Erro ao atualizar last_password_reset:', profileError);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao resetar senha.' };
  }
}