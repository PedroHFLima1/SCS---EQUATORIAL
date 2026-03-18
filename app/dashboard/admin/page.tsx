'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { ShieldAlert, Users, Settings, Eye, Search, Filter, Edit2, Pencil, XCircle, X, AlertTriangle, Key, CheckCircle, Clock, Activity, AlertOctagon, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createUser, updateUser, toggleUserStatus, resetUserPassword, getUsers } from '@/app/actions/users';

// Mock Data for Master Audit
const masterProcesses = [
  { id: '1', inscricao: '991203', projeto: 'TRAV_01', module: 'Travessia', partner: 'APPLUS', status: 'NOVO', protocol: 'Não gerado', sla: 2, concessionaria: 'Equatorial MA' },
  { id: '2', inscricao: '881440', projeto: 'AMB_02', module: 'Ambiental', partner: 'INFOTEC', status: 'CORREÇÃO', protocol: 'Não gerado', sla: 12, concessionaria: 'Equatorial PA' },
  { id: '3', inscricao: '765209', projeto: 'ANU_03', module: 'Anuência', partner: 'TRACTEBEL', status: 'FINALIZADO', protocol: 'A-123456', sla: 35, concessionaria: 'Equatorial PI' },
  { id: '4', inscricao: '543190', projeto: 'TRAV_04', module: 'Travessia', partner: 'APPLUS', status: 'PROTOCOLADO', protocol: 'P-987654', sla: 1, concessionaria: 'Equatorial AL' },
];

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'auditoria' | 'configuracoes'>('usuarios');

  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<string | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', profile: 'PARCEIRO', company: '' });
  const [userFormError, setUserFormError] = useState('');
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchPartners();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const result = await getUsers();
      if (result.error) throw new Error(result.error);
      setUsers(result.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
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
  const [processes, setProcesses] = useState(masterProcesses);
  const [auditSearch, setAuditSearch] = useState('');
  const [searchInscricao, setSearchInscricao] = useState('');
  const [searchProjeto, setSearchProjeto] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas as Fases');
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

  // Audit Actions
  const filteredAudit = useMemo(() => {
    let result = Array.isArray(processes) ? processes : [];

    // Global Search
    if (auditSearch) {
      const lowerSearch = auditSearch.toLowerCase();
      result = result.filter(p => 
        p.inscricao.toLowerCase().includes(lowerSearch) || 
        p.projeto.toLowerCase().includes(lowerSearch) || 
        p.protocol.toLowerCase().includes(lowerSearch) ||
        p.concessionaria.toLowerCase().includes(lowerSearch) ||
        p.partner.toLowerCase().includes(lowerSearch)
      );
    }

    // Specific Filters
    if (searchInscricao) {
      result = result.filter(p => p.inscricao.toLowerCase().includes(searchInscricao.toLowerCase()));
    }
    if (searchProjeto) {
      result = result.filter(p => p.projeto.toLowerCase().includes(searchProjeto.toLowerCase()));
    }
    if (statusFilter !== 'Todas as Fases') {
      result = result.filter(p => p.status === statusFilter);
    }
    if (concessionariaFilter !== 'Todas') {
      result = result.filter(p => p.concessionaria === concessionariaFilter);
    }
    if (parceiraFilter !== 'Todas') {
      result = result.filter(p => p.partner === parceiraFilter);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'Inscrição (A-Z)') return a.inscricao.localeCompare(b.inscricao);
      if (sortBy === 'Inscrição (Z-A)') return b.inscricao.localeCompare(a.inscricao);
      if (sortBy === 'SLA (Maior-Menor)') return b.sla - a.sla;
      if (sortBy === 'SLA (Menor-Maior)') return a.sla - b.sla;
      return 0;
    });

    return result;
  }, [processes, auditSearch, searchInscricao, searchProjeto, statusFilter, concessionariaFilter, parceiraFilter, sortBy]);

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
    setUserFormData({ name: '', email: '', profile: 'PARCEIRO', company: '' });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: any) => {
    setEditingUser(user);
    setUserFormData({ name: user.name || '', email: user.email || '', profile: user.profile || 'PARCEIRO', company: user.company || '' });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userFormData.name || (!editingUser && !userFormData.email) || !userFormData.profile || !userFormData.company) {
      setUserFormError('Por favor, preencha todos os campos.');
      return;
    }

    setUserFormLoading(true);
    setUserFormError('');

    try {
      if (editingUser) {
        const result = await updateUser(editingUser.id, {
          name: userFormData.name,
          profile: userFormData.profile,
          company: userFormData.company,
        });

        if (result.error) {
          setUserFormError(result.error);
          return;
        }
      } else {
        const result = await createUser({
          email: userFormData.email,
          name: userFormData.name,
          profile: userFormData.profile,
          company: userFormData.company,
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

  const handleSaveProtocol = () => {
    if (processToEdit) {
      setProcesses(processes.map(p => 
        p.id === processToEdit.id 
          ? { ...p, ...editFormData } 
          : p
      ));
    }
    setIsEditProtocolModalOpen(false);
    setProcessToEdit(null);
    alert('Projeto alterado com sucesso!');
  };

  const confirmCancelProject = (id: string) => {
    setProjectToDelete(id);
    setIsDeleteProjectModalOpen(true);
  };

  const handleCancelProject = () => {
    if (projectToDelete) {
      setProcesses(processes.map(p => 
        p.id === projectToDelete 
          ? { ...p, status: 'CANCELADO' } 
          : p
      ));
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
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">APPLUS</p>
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
              Auditoria Master (Olho de Deus)
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Auditoria Master */}
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
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas as Fases</option>
                  <option>NOVO</option>
                  <option>EM ANÁLISE</option>
                  <option>CORREÇÃO</option>
                  <option>PROTOCOLADO</option>
                  <option>FINALIZADO</option>
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
                  <option>Equatorial MA</option>
                  <option>Equatorial PA</option>
                  <option>Equatorial PI</option>
                  <option>Equatorial AL</option>
                  <option>Equatorial GO</option>
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
                  <option>APPLUS</option>
                  <option>INFOTEC</option>
                  <option>TRACTEBEL</option>
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
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-950/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">INSCRIÇÃO</th>
                  <th className="px-6 py-3 font-medium">PROJETO</th>
                  <th className="px-6 py-3 font-medium">MÓDULO</th>
                  <th className="px-6 py-3 font-medium">PARCEIRA</th>
                  <th className="px-6 py-3 font-medium">CONCESSIONÁRIA</th>
                  <th className="px-6 py-3 font-medium">STATUS</th>
                  <th className="px-6 py-3 font-medium">PROTOCOLO</th>
                  <th className="px-6 py-3 font-medium">SLA (DIAS)</th>
                  <th className="px-6 py-3 font-medium text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredAudit.map((process, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">{process.inscricao}</td>
                    <td className="px-6 py-4">{process.projeto}</td>
                    <td className="px-6 py-4">{process.module}</td>
                    <td className="px-6 py-4">{process.partner}</td>
                    <td className="px-6 py-4">{process.concessionaria}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-300">
                        {process.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{process.protocol}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${process.sla > slaDays ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-300'}`}>
                        {process.sla} / {slaDays}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditProtocol(process)}
                          className="flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                          title="Edição Administrativa"
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5 text-gray-500" />
                          Editar
                        </button>
                        <button
                          onClick={() => confirmCancelProject(process.id)}
                          className="flex items-center justify-center rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 shadow-sm"
                          title="Cancelar Projeto"
                        >
                          <XCircle className="mr-2 h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAudit.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum projeto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                Este valor será usado como base para calcular o atraso de todos os projetos na Auditoria Master.
              </p>
            </div>
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
                  <option value="Administrador">Administrador</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Parceiro">Parceiro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Empresa</label>
                <select
                  value={userFormData.company}
                  onChange={(e) => setUserFormData({ ...userFormData, company: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option value="">Selecione a Empresa</option>
                  <option value="Equatorial">Equatorial</option>
                  <option value="Applus">Applus</option>
                  <option value="Infotec">Infotec</option>
                  <option value="Tractebel">Tractebel</option>
                  <option value="Outra Empresa">Outra Empresa</option>
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
                className="rounded-md bg-[#1e293b] dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-blue-700"
              >
                Salvar
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
                  <option value="APPLUS">APPLUS</option>
                  <option value="INFOTEC">INFOTEC</option>
                  <option value="TRACTEBEL">TRACTEBEL</option>
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
                  SLA (Dias)
                </label>
                <input
                  type="number"
                  value={editFormData.sla}
                  onChange={(e) => setEditFormData({...editFormData, sla: Number(e.target.value)})}
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
                  <option value="Equatorial MA">Equatorial MA</option>
                  <option value="Equatorial PA">Equatorial PA</option>
                  <option value="Equatorial PI">Equatorial PI</option>
                  <option value="Equatorial AL">Equatorial AL</option>
                  <option value="Equatorial GO">Equatorial GO</option>
                  <option value="Equatorial RS">Equatorial RS</option>
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
