'use server';

import { createClient } from '@supabase/supabase-js';

// 1. BLINDAGEM DE TIPOS: Definindo os valores exatos permitidos no sistema
type UserProfileRole = 'ADMIN' | 'PARCEIRO' | 'CONCESSIONARIA';
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

    const usersWithProfiles = users.map(user => {
      const profile = profiles.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        name: profile?.name || '',
        profile: (profile?.profile as UserProfileRole) || '',
        company: profile?.company || '',
        status: (profile?.status as UserStatus) || 'Inativo',
        created_at: profile?.created_at || user.created_at
      };
    });

    return { success: true, users: usersWithProfiles };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao listar usuários.' };
  }
}

// A assinatura da função agora exige os tipos restritos
export async function createUser(data: { email: string; name: string; profile: UserProfileRole; company: string }) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada (SUPABASE_SERVICE_ROLE_KEY).' };
  }

  try {
    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: 'Password123!', // Senha temporária. É boa prática forçar o reset no primeiro login.
      email_confirm: true,
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Erro ao criar usuário.' };
    }

    // 2. Update profile
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
export async function updateUser(userId: string, data: { name: string; profile: UserProfileRole; company: string }) {
  if (!supabaseServiceRoleKey) {
    return { error: 'Chave de serviço do Supabase não configurada.' };
  }

  try {
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

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado ao resetar senha.' };
  }
}