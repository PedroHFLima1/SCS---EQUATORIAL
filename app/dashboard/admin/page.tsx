'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { ShieldAlert, Users, Settings, Eye, Search, Filter, Edit2, Pencil, XCircle, X, AlertTriangle, Key, CheckCircle, Clock, Activity, AlertOctagon, RotateCcw, AlertCircle, Loader2, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createUser, updateUser, toggleUserStatus, resetUserPassword, getUsers, deleteUser } from '@/app/actions/users';
import Papa from 'papaparse';
import { useSocket } from '@/hooks/useSocket';
import { DrillDownTable } from '@/components/DrillDownTable';
import { CONCESSIONARIAS, STATUS_COLORS } from '@/lib/constants';

const getSlaColor = (sla: number | string) => {
  const days = typeof sla === 'string' ? parseInt(sla.replace('d', '')) || 0 : sla;
  if (days <= 2) return 'bg-green-100 text-green-700';
  if (days <= 5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminPage() {
  const { isAdmin, email } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'auditoria' | 'configuracoes' | 'importacao'>('usuarios');

  useEffect(() => {
    if (socket) {
      socket.on('process-updated', (updatedProcess: any) => {
        setProcesses(prev => prev.map(p => p.id === updatedProcess.id ? updatedProcess : p));
      });
    }
    return () => {
      if (socket) socket.off('process-updated');
    };
  }, [socket]);

  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', profile: 'PARCEIRA', company: '', password: '' });
  const [userFormError, setUserFormError] = useState('');
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [partners, setPartners] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchPartners();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const result = await getUsers();
      if (result.error) throw new Error(result.error);
      setUsers(result.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setUsersError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('status', 'Ativo')
        .order('name');
      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error('Error fetching partners:', err);
    }
  };

  // Audit State
  const [processes, setProcesses] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [searchInscricao, setSearchInscricao] = useState('');
  const [searchProjeto, setSearchProjeto] = useState('');

  const debouncedAuditSearch = useDebounce(auditSearch, 300);
  const debouncedSearchInscricao = useDebounce(searchInscricao, 300);
  const debouncedSearchProjeto = useDebounce(searchProjeto, 300);

  const [statusInscricaoFilter, setStatusInscricaoFilter] = useState('Todas as Fases');
  const [statusProjetoFilter, setStatusProjetoFilter] = useState('Todas as Fases');
  const [concessionariaFilter, setConcessionariaFilter] = useState('Todas');
  const [parceiraFilter, setParceiraFilter] = useState('Todas');
  const [sortBy, setSortBy] = useState('Inscrição (A-Z)');
  
  const [isEditProtocolModalOpen, setIsEditProtocolModalOpen] = useState(false);
  const [processToEdit, setProcessToEdit] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ module: '', partner: '', status: '', protocol: '', sla: 0, concessionaria: '' });
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Settings State
  const [slaDays, setSlaDays] = useState(30);

  // Import State
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const res = await fetch('/api/processes');
      const data = await res.json();
      setProcesses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
      setProcesses([]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportStatus(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportStatus('Processando arquivo...');

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          const BATCH_SIZE = 100;
          let totalImported = 0;

          for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            setImportStatus(`Importando lote ${Math.floor(i / BATCH_SIZE) + 1} de ${Math.ceil(data.length / BATCH_SIZE)}...`);
            
            const res = await fetch('/api/processes/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ processes: batch })
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || 'Falha na importação do lote');
            }
            
            const result = await res.json();
            totalImported += result.count || 0;
          }

          setImportStatus(`Sucesso! ${totalImported} processos importados.`);
          setSelectedFile(null); // Reset file selection after success
          // Refresh audit data if needed
        } catch (error: any) {
          console.error('Import error:', error);
          setImportStatus(`Erro na importação: ${error.message}`);
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        setImportStatus(`Erro ao ler CSV: ${error.message}`);
        setIsImporting(false);
      }
    });
  };

  // Audit Actions
  const filteredAudit = useMemo(() => {
    let result = Array.isArray(processes) ? processes : [];

    // Global Search
    if (debouncedAuditSearch) {
      const lowerSearch = debouncedAuditSearch.toLowerCase();
      result = result.filter(p => 
        (p.inscricao && p.inscricao.toLowerCase().includes(lowerSearch)) || 
        (p.projeto && p.projeto.toLowerCase().includes(lowerSearch)) || 
        (p.protocol && p.protocol.toLowerCase().includes(lowerSearch)) ||
        (p.concessionaria && p.concessionaria.toLowerCase().includes(lowerSearch)) ||
        (p.partner && p.partner.toLowerCase().includes(lowerSearch))
      );
    }

    // Specific Filters
    if (debouncedSearchInscricao) {
      result = result.filter(p => p.inscricao && p.inscricao.toLowerCase().includes(debouncedSearchInscricao.toLowerCase()));
    }
    if (debouncedSearchProjeto) {
      result = result.filter(p => p.projeto && p.projeto.toLowerCase().includes(debouncedSearchProjeto.toLowerCase()));
    }
    if (statusInscricaoFilter !== 'Todas as Fases') {
      result = result.filter(p => (p.statusInscricao || p.status) === statusInscricaoFilter);
    }
    if (statusProjetoFilter !== 'Todas as Fases') {
      result = result.filter(p => p.status === statusProjetoFilter);
    }
    if (concessionariaFilter !== 'Todas') {
      result = result.filter(p => p.concessionaria === concessionariaFilter);
    }
    if (parceiraFilter !== 'Todas') {
      result = result.filter(p => {
        const processPartner = p.partner || p.parceiraProjeto || '';
        return processPartner.toLowerCase() === parceiraFilter.toLowerCase();
      });
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'Inscrição (A-Z)') return a.inscricao.localeCompare(b.inscricao);
      if (sortBy === 'Inscrição (Z-A)') return b.inscricao.localeCompare(a.inscricao);
      // SLA sorting
      const slaA = typeof a.sla === 'string' ? parseInt(a.sla.replace('d', '')) || 0 : a.sla || 0;
      const slaB = typeof b.sla === 'string' ? parseInt(b.sla.replace('d', '')) || 0 : b.sla || 0;

      if (sortBy === 'SLA (Maior-Menor)') return slaB - slaA;
      if (sortBy === 'SLA (Menor-Maior)') return slaA - slaB;
      return 0;
    });

    return result;
  }, [processes, debouncedAuditSearch, debouncedSearchInscricao, debouncedSearchProjeto, statusInscricaoFilter, statusProjetoFilter, concessionariaFilter, parceiraFilter, sortBy]);

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Negado</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Apenas administradores têm acesso ao Painel Admin.
        </p>
      </div>
    );
  }

  // User Actions
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserFormData({ name: '', email: '', profile: 'PARCEIRA', company: '', password: '' });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: any) => {
    setEditingUser(user);
    setUserFormData({ name: user.name || '', email: user.email || '', profile: user.profile || 'PARCEIRA', company: user.company || '', password: '' });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userFormData.name || (!editingUser && !userFormData.email) || !userFormData.profile || !userFormData.company) {
      setUserFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!editingUser && (!userFormData.password || userFormData.password.length < 6)) {
      setUserFormError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setUserFormLoading(true);
    setUserFormError('');

    try {
      if (editingUser) {
        const result = await updateUser(editingUser.id, {
          name: userFormData.name,
          profile: userFormData.profile as 'ADMIN' | 'GESTOR' | 'PARCEIRA',
          company: userFormData.company,
          password: userFormData.password || undefined,
        });

        if (result.error) {
          setUserFormError(result.error);
          return;
        }
      } else {
        const result = await createUser({
          email: userFormData.email,
          name: userFormData.name,
          profile: userFormData.profile as 'ADMIN' | 'GESTOR' | 'PARCEIRA',
          company: userFormData.company,
          password: userFormData.password,
        });

        if (result.error) {
          setUserFormError(result.error);
          return;
        }
      }

      await fetchUsers();
      setIsUserModalOpen(false);
    } catch (err: any) {
      setUserFormError(err.message || 'Erro inesperado.');
    } finally {
      setUserFormLoading(false);
    }
  };

  const confirmToggleUserStatus = (id: string) => {
    setUserToToggle(id);
    setIsToggleModalOpen(true);
  };

  const handleToggleUserStatus = async () => {
    if (userToToggle) {
      const user = users.find(u => u.id === userToToggle);
      if (user) {
        const result = await toggleUserStatus(user.id, user.status);
        if (result.error) {
          alert(result.error);
        } else {
          await fetchUsers();
        }
      }
      setIsToggleModalOpen(false);
      setUserToToggle(null);
    }
  };

  const confirmResetPassword = (id: string) => {
    setUserToReset(id);
    setIsResetModalOpen(true);
  };

  const confirmDeleteUser = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (userToReset) {
      const result = await resetUserPassword(userToReset);
      if (result.error) {
        alert(result.error);
      } else {
        alert('Senha resetada com sucesso para: Password123!');
      }
      setIsResetModalOpen(false);
      setUserToReset(null);
    }
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      const result = await deleteUser(userToDelete);
      if (result.error) {
        alert(result.error);
      } else {
        await fetchUsers();
      }
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const openEditProtocol = (process: any) => {
    setProcessToEdit(process);
    setEditFormData({ 
      module: process.module, 
      partner: process.partner, 
      status: process.status, 
      protocol: process.protocol, 
      sla: process.sla, 
      concessionaria: process.concessionaria 
    });
    setIsEditProtocolModalOpen(true);
  };

  const handleSaveProtocol = async () => {
    if (processToEdit) {
      try {
        const res = await fetch('/api/processes/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: processToEdit.id,
            ...editFormData,
            user: email || 'Admin'
          }),
        });

        if (!res.ok) throw new Error('Failed to update process');
        
        const updatedProcess = await res.json();

        setProcesses(processes.map(p => 
          p.id === processToEdit.id 
            ? { ...p, ...updatedProcess } 
            : p
        ));
        
        alert('Projeto alterado com sucesso!');
      } catch (error) {
        console.error('Error updating process:', error);
        alert('Erro ao alterar projeto.');
      }
    }
    setIsEditProtocolModalOpen(false);
    setProcessToEdit(null);
  };

  const confirmCancelProject = (id: string) => {
    setProjectToDelete(id);
    setIsDeleteProjectModalOpen(true);
  };

  const handleCancelProject = async () => {
    if (projectToDelete) {
      try {
        const res = await fetch('/api/processes/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: projectToDelete,
            status: 'CANCELADO',
            user: email || 'Admin'
          }),
        });

        if (!res.ok) throw new Error('Failed to cancel process');
        
        const updatedProcess = await res.json();
        
        setProcesses(processes.map(p => 
          p.id === projectToDelete 
            ? { ...p, status: 'CANCELADO' } 
            : p
        ));
      } catch (error) {
        console.error('Error cancelling process:', error);
        alert('Erro ao cancelar projeto.');
      }
      setIsDeleteProjectModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleSaveSla = () => {
    alert('Configurações de SLA salvas com sucesso!');
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">PAINEL ADMINISTRATIVO</h1>
        <p className="text-gray-500 dark:text-gray-400">Gestão avançada, auditoria e parametrização do sistema.</p>
      </div>

      {/* Performance Dashboards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow-sm border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Projetos Críticos (&gt; 30 dias)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">12</p>
            </div>
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
          </div>
        </div>
        
        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Parceira mais Atarefada</p>
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">Applus</p>
              <p className="text-xs text-gray-500 mt-1">45 projetos no backlog</p>
            </div>
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-500" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Taxa de Correção</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">18%</p>
            </div>
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
              <RotateCcw className="h-6 w-6 text-orange-600 dark:text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <nav className="-mb-px flex space-x-8 min-w-max pb-1">
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'usuarios'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Gestão de Usuários Pro
            </div>
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'auditoria'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Eye className="mr-2 h-4 w-4" />
              Auditoria
            </div>
          </button>
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'configuracoes'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Configurações de SLA
            </div>
          </button>
          <button
            onClick={() => setActiveTab('importacao')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'importacao'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Upload className="mr-2 h-4 w-4" />
              Importação de Dados
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content: Gestão de Usuários Pro */}
      {activeTab === 'usuarios' && (
        <div className="rounded-lg bg-white dark:bg-gray-900 shadow-sm border border-transparent dark:border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">ACESSOS DO SISTEMA</h2>
            <button onClick={openAddUserModal} className="rounded-md bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              NOVO USUÁRIO
            </button>
          </div>
          
          {usersError && (
            <div className="m-4 rounded-md bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-800">
              <div className="flex">
                <ShieldAlert className="h-5 w-5 text-red-400 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Erro ao carregar usuários
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{usersError}</p>
                    <p className="mt-2 font-semibold">Para corrigir:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li>Abra as <strong>Configurações</strong> (ícone de engrenagem no canto superior direito do AI Studio).</li>
                      <li>Vá em <strong>Secrets</strong>.</li>
                      <li>Adicione uma nova chave chamada <code>SUPABASE_SERVICE_ROLE_KEY</code>.</li>
                      <li>Cole a sua chave de serviço do Supabase como valor.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-950/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">NOME</th>
                  <th className="px-6 py-3 font-medium">E-MAIL</th>
                  <th className="px-6 py-3 font-medium">EMPRESA</th>
                  <th className="px-6 py-3 font-medium">PERFIL</th>
                  <th className="px-6 py-3 font-medium">STATUS</th>
                  <th className="px-6 py-3 font-medium text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.company}</td>
                    <td className="px-6 py-4">{user.profile}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditUserModal(user)}
                          className="flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                          title="Editar Usuário"
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5 text-gray-500" />
                          Editar
                        </button>
                        <button
                          onClick={() => confirmResetPassword(user.id)}
                          className="flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm leading-tight"
                          title="Resetar Senha"
                        >
                          <Key className="mr-2 h-3.5 w-3.5 text-gray-500" />
                          <span className="text-left">Resetar<br/>Senha</span>
                        </button>
                        <button
                          onClick={() => confirmToggleUserStatus(user.id)}
                          className={`flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm ${
                            user.status === 'Ativo' 
                              ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40'
                              : 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40'
                          }`}
                        >
                          {user.status === 'Ativo' ? (
                            <><AlertCircle className="mr-2 h-3.5 w-3.5" /> Inativar</>
                          ) : (
                            <><CheckCircle className="mr-2 h-3.5 w-3.5" /> Ativar</>
                          )}
                        </button>
                        <button
                          onClick={() => confirmDeleteUser(user.id)}
                          className="flex items-center justify-center rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 shadow-sm"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Auditoria */}
      {activeTab === 'auditoria' && (
        <div className="rounded-lg bg-white dark:bg-gray-900 shadow-sm border border-transparent dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-800 p-4 gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">VISÃO GLOBAL DE PROJETOS</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button className="flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                <Filter className="mr-2 h-4 w-4" />
                VER TUDO (IGNORAR TRAVAS)
              </button>
            </div>
          </div>
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 w-full items-end">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buscar Inscrição</label>
                <input
                  type="text"
                  placeholder="Ex: 2025-0001"
                  value={searchInscricao}
                  onChange={(e) => setSearchInscricao(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buscar Projeto</label>
                <input
                  type="text"
                  placeholder="Ex: ESTRUTURAL"
                  value={searchProjeto}
                  onChange={(e) => setSearchProjeto(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Inscrição</label>
                <select 
                  value={statusInscricaoFilter}
                  onChange={(e) => setStatusInscricaoFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas as Fases</option>
                  <option>NÃO SE APLICA</option>
                  <option>NÃO INICIADO</option>
                  <option>EM ANDAMENTO</option>
                  <option>PROTOCOLADO</option>
                  <option>APROVADO</option>
                  <option>CANCELADO</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Projeto</label>
                <select 
                  value={statusProjetoFilter}
                  onChange={(e) => setStatusProjetoFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas as Fases</option>
                  <option>CANCELADO</option>
                  <option>NÃO INICIADO</option>
                  <option>TAXA</option>
                  <option>REGISTRO SEMAD</option>
                  <option>PROTOCOLADO</option>
                  <option>APROVADO</option>
                  <option>EM CORREÇÃO</option>
                  <option>EM ANDAMENTO CONCESSIONÁRIA</option>
                  <option>NOVO</option>
                  <option>TRIAGEM</option>
                  <option>PREVISÃO DE BOLETO</option>
                  <option>AGUARDANDO PAGAMENTO</option>
                  <option>EM TRATATIVA</option>
                  <option>CORREÇÃO</option>
                  <option>EM ELABORAÇÃO</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Concessionária</label>
                <select 
                  value={concessionariaFilter}
                  onChange={(e) => setConcessionariaFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas</option>
                  {CONCESSIONARIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Parceira</label>
                <select 
                  value={parceiraFilter}
                  onChange={(e) => setParceiraFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas</option>
                  <option>Afaplan</option>
                  <option>Applus</option>
                </select>
              </div>
              <div className="w-full shrink-0">
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ordenar Por</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Inscrição (A-Z)</option>
                  <option>Inscrição (Z-A)</option>
                  <option>SLA (Maior-Menor)</option>
                  <option>SLA (Menor-Maior)</option>
                </select>
              </div>
            </div>
          </div>
          
          <DrillDownTable 
            processes={filteredAudit} 
            role="ADMIN" 
            moduleName="admin"
            openTreatment={openEditProtocol} 
            confirmCancel={(process) => confirmCancelProject(process.id)} 
          />
        </div>
      )}

      {/* Tab Content: Configurações de SLA */}
      {activeTab === 'configuracoes' && (
        <div className="max-w-2xl rounded-lg bg-white dark:bg-gray-900 shadow-sm border border-transparent dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">PARAMETRIZAÇÃO DO SISTEMA</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prazo Padrão de SLA (Dias)
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-xs">
                  <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={slaDays}
                    onChange={(e) => setSlaDays(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                  />
                </div>
                <button 
                  onClick={handleSaveSla}
                  className="rounded-md bg-[#1e293b] dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-blue-700"
                >
                  Salvar Alteração
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Este valor será usado como base para calcular o atraso de todos os projetos na Auditoria.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Importação de Dados */}
      {activeTab === 'importacao' && (
        <div className="max-w-2xl rounded-lg bg-white dark:bg-gray-900 shadow-sm border border-transparent dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">IMPORTAÇÃO DE DADOS (CSV)</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selecione o arquivo CSV
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900/30 dark:file:text-blue-400"
                />
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || isImporting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importar
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                O arquivo deve conter as colunas da query SQL (ID_SOLICITACAO, PROJETO, FLUXO_PASSAGEM, FLUXO_TRAVESSIA, FLUXO_AMBIENTAL, PARCEIRA_PROJETO, etc).
              </p>
            </div>
            
            {importStatus && (
              <div className={`p-4 rounded-md ${importStatus.includes('Erro') ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                {importStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <Key className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Resetar Senha</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tem certeza que deseja gerar uma nova senha temporária para este usuário?
              </p>
            </div>
            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sim, Resetar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Excluir Usuário</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tem certeza que deseja excluir este usuário permanentemente? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {isToggleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Confirmar Alteração</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tem certeza que deseja alterar o status de acesso deste usuário?
              </p>
            </div>
            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => {
                  setIsToggleModalOpen(false);
                  setUserToToggle(null);
                }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleUserStatus}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                Sim, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b dark:border-gray-800 p-4 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {userFormError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">
                  {userFormError}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="Insira o nome completo"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail Corporativo</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="exemplo@empresa.com"
                  disabled={!!editingUser}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {editingUser ? 'Nova Senha (opcional)' : 'Senha'}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder={editingUser ? "Deixe em branco para não alterar" : "Mínimo de 6 caracteres"}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Perfil</label>
                <select
                  value={userFormData.profile}
                  onChange={(e) => setUserFormData({ ...userFormData, profile: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option value="">Selecione o Perfil</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="GESTOR">Gestor</option>
                  <option value="PARCEIRA">Parceira</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Empresa</label>
                <select
                  value={userFormData.company}
                  onChange={(e) => setUserFormData({ ...userFormData, company: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option value="">Selecione a Empresa/Módulo</option>
                  {userFormData.profile === 'GESTOR' && (
                    <>
                      <option value="Travessia">Módulo Travessia</option>
                      <option value="Ambiental">Módulo Ambiental</option>
                      <option value="Anuência">Módulo Anuência</option>
                    </>
                  )}
                  {userFormData.profile === 'PARCEIRA' && (
                    <>
                      <option value="Afaplan">Afaplan</option>
                      <option value="Applus">Applus</option>
                    </>
                  )}
                  {userFormData.profile === 'ADMIN' && (
                    <option value="Equatorial">Equatorial</option>
                  )}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg shrink-0">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={userFormLoading}
                className="rounded-md bg-[#1e293b] dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {userFormLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Protocol Modal */}
      {isEditProtocolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b dark:border-gray-800 p-4 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edição Administrativa</h3>
              <button onClick={() => setIsEditProtocolModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 mb-4 border border-yellow-200 dark:border-yellow-900/50">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-400">
                    Você está realizando uma edição administrativa. Esta ação ignora as travas de status do sistema e será registrada em log.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Módulo
                </label>
                <select
                  value={editFormData.module}
                  onChange={(e) => setEditFormData({...editFormData, module: e.target.value})}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option value="Travessia">Travessia</option>
                  <option value="Ambiental">Ambiental</option>
                  <option value="Anuência">Anuência</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parceira
                </label>
                <select
                  value={editFormData.partner}
                  onChange={(e) => setEditFormData({...editFormData, partner: e.target.value})}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option value="Afaplan">Afaplan</option>
                  <option value="Applus">Applus</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option value="NOVO">NOVO</option>
                  <option value="EM ANÁLISE">EM ANÁLISE</option>
                  <option value="CORREÇÃO">CORREÇÃO</option>
                  <option value="PROTOCOLADO">PROTOCOLADO</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                  <option value="APROVADO">APROVADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                  <option value="NÃO INICIADO">NÃO INICIADO</option>
                  <option value="NÃO SE APLICA">NÃO SE APLICA</option>
                  <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                  <option value="ATENDIDO">ATENDIDO</option>
                  <option value="NEGADO">NEGADO</option>
                  <option value="DUP">DUP</option>
                  <option value="EM ESTUDO">EM ESTUDO</option>
                  <option value="TAXA">TAXA</option>
                  <option value="REGISTRO SEMAD">REGISTRO SEMAD</option>
                  <option value="EM CORREÇÃO">EM CORREÇÃO</option>
                  <option value="EM ANDAMENTO CONCESSIONÁRIA">EM ANDAMENTO CONCESSIONÁRIA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número do Protocolo
                </label>
                <input
                  type="text"
                  value={editFormData.protocol}
                  onChange={(e) => setEditFormData({...editFormData, protocol: e.target.value})}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Concessionária
                </label>
                <select
                  value={editFormData.concessionaria}
                  onChange={(e) => setEditFormData({...editFormData, concessionaria: e.target.value})}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option value="">Selecione</option>
                  {CONCESSIONARIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg shrink-0">
              <button
                onClick={() => setIsEditProtocolModalOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Voltar
              </button>
              <button
                onClick={handleSaveProtocol}
                className="rounded-md bg-[#1e293b] dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-blue-700"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Project Confirmation Modal */}
      {isDeleteProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Cancelar Projeto</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tem certeza que deseja cancelar este projeto? O registro permanecerá no sistema com o status &quot;CANCELADO&quot;.
              </p>
            </div>
            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => {
                  setIsDeleteProjectModalOpen(false);
                  setProjectToDelete(null);
                }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelProject}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
