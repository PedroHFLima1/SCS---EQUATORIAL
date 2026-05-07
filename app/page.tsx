'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronDown, 
  ShieldCheck, 
  ArrowRightLeft, 
  FileText, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  XSquare, 
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { 
  AnuenciaInscriptionStatus, 
  AnuenciaProjectStatus, 
  TravessiaInscriptionStatus, 
  TravessiaProjectStatus, 
  TravessiaProtocolStatus,
  calculateAnuenciaInscriptionStatus,
  calculateTravessiaProjectStatus,
  calculateTravessiaInscriptionStatus
} from '@/lib/status-logic';

// --- Types ---
interface AnuenciaProject {
  id: string;
  name: string;
  status: AnuenciaProjectStatus;
}

interface AnuenciaInscription {
  id: string;
  name: string;
  status: AnuenciaInscriptionStatus;
  projects: AnuenciaProject[];
}

interface TravessiaProtocol {
  id: string;
  name: string;
  status: TravessiaProtocolStatus;
}

interface TravessiaProject {
  id: string;
  name: string;
  status: TravessiaProjectStatus;
  protocols: TravessiaProtocol[];
}

interface TravessiaInscription {
  id: string;
  name: string;
  status: TravessiaInscriptionStatus;
  projects: TravessiaProject[];
}

// --- Initial Data ---
const initialAnuencia: AnuenciaInscription[] = [
  {
    id: 'A1',
    name: 'Inscrição 001/2024',
    status: AnuenciaInscriptionStatus.NAO_INICIADO,
    projects: [
      { id: 'AP1', name: 'Ambiental - Torre 01', status: AnuenciaProjectStatus.NOVO },
      { id: 'AP2', name: 'Estrutural - Torre 01', status: AnuenciaProjectStatus.NOVO },
    ]
  }
];

const initialTravessia: TravessiaInscription[] = [
  {
    id: 'T1',
    name: 'Travessia Rio Tocantins',
    status: TravessiaInscriptionStatus.NAO_INICIADO,
    projects: [
      { 
        id: 'TP1', 
        name: 'Obra 12 - Subterrânea', 
        status: TravessiaProjectStatus.NOVO,
        protocols: [
          { id: 'TPR1', name: 'Licença Pref. 04', status: TravessiaProtocolStatus.PROTOCOLADO },
        ]
      }
    ]
  }
];

export default function StatusManager() {
  const [activeTab, setActiveTab] = useState<'ANUENCIA' | 'TRAVESSIA'>('ANUENCIA');
  const [anuenciaData, setAnuenciaData] = useState<AnuenciaInscription[]>(initialAnuencia);
  const [travessiaData, setTravessiaData] = useState<TravessiaInscription[]>(initialTravessia);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['A1', 'T1', 'TP1']));

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  // --- ANUENCIA Handlers ---
  const updateAnuenciaProjectStatus = (insId: string, projId: string, newStatus: AnuenciaProjectStatus) => {
    setAnuenciaData(prev => prev.map(ins => {
      if (ins.id !== insId) return ins;
      const updatedProjects = ins.projects.map(p => p.id === projId ? { ...p, status: newStatus } : p);
      const calculatedStatus = calculateAnuenciaInscriptionStatus(
        ins.status,
        updatedProjects.map(p => p.status)
      );
      return { ...ins, projects: updatedProjects, status: calculatedStatus };
    }));
  };

  const addAnuenciaProject = (insId: string) => {
    setAnuenciaData(prev => prev.map(ins => {
      if (ins.id !== insId) return ins;
      const newProj: AnuenciaProject = {
        id: `AP${Math.random().toString(36).substr(2, 4)}`,
        name: `Novo Projeto ${ins.projects.length + 1}`,
        status: AnuenciaProjectStatus.NOVO
      };
      const updatedProjects = [...ins.projects, newProj];
      return { ...ins, projects: updatedProjects };
    }));
  };

  // --- TRAVESSIA Handlers ---
  const updateTravessiaProtocolStatus = (insId: string, projId: string, protoId: string, newStatus: TravessiaProtocolStatus) => {
    setTravessiaData(prev => prev.map(ins => {
      if (ins.id !== insId) return ins;
      const updatedProjects = ins.projects.map(p => {
        if (p.id !== projId) return p;
        const updatedProtocols = p.protocols.map(pr => pr.id === protoId ? { ...pr, status: newStatus } : pr);
        const newProjStatus = calculateTravessiaProjectStatus(p.status, updatedProtocols.map(pr => pr.status));
        return { ...p, protocols: updatedProtocols, status: newProjStatus };
      });
      const newInsStatus = calculateTravessiaInscriptionStatus(ins.status, updatedProjects.map(p => p.status));
      return { ...ins, projects: updatedProjects, status: newInsStatus };
    }));
  };

  const updateTravessiaProjectStatusManually = (insId: string, projId: string, newStatus: TravessiaProjectStatus) => {
    setTravessiaData(prev => prev.map(ins => {
        if (ins.id !== insId) return ins;
        const updatedProjects = ins.projects.map(p => p.id === projId ? { ...p, status: newStatus } : p);
        const newInsStatus = calculateTravessiaInscriptionStatus(ins.status, updatedProjects.map(p => p.status));
        return { ...ins, projects: updatedProjects, status: newInsStatus };
    }));
  }

  const addTravessiaProtocol = (insId: string, projId: string) => {
    setTravessiaData(prev => prev.map(ins => {
      if (ins.id !== insId) return ins;
      const updatedProjects = ins.projects.map(p => {
        if (p.id !== projId) return p;
        const newProto: TravessiaProtocol = {
          id: `TPR${Math.random().toString(36).substr(2, 4)}`,
          name: `Protocolo ${p.protocols.length + 1}`,
          status: TravessiaProtocolStatus.PROTOCOLADO
        };
        return { ...p, protocols: [...p.protocols, newProto] };
      });
      return { ...ins, projects: updatedProjects };
    }));
  };

  // --- UI Components ---
  const StatusBadge = ({ status }: { status: string }) => {
    let colors = "bg-slate-100 text-slate-700";
    let Icon = Clock;

    if (status === 'APROVADO' || status === 'ATENDIDO') {
      colors = "bg-emerald-100 text-emerald-700 border-emerald-200";
      Icon = CheckCircle2;
    } else if (status === 'EM ANDAMENTO' || status.includes('PROTOCOLADO') || status === 'TAXA' || status.includes('CONCESSIONÁRIA')) {
      colors = "bg-blue-100 text-blue-700 border-blue-200";
      Icon = RefreshCw;
    } else if (status === 'CANCELADO' || status === 'NEGADO' || status === 'DUP') {
      colors = "bg-rose-100 text-rose-700 border-rose-200";
      Icon = XSquare;
    } else {
      colors = "bg-amber-100 text-amber-700 border-amber-200";
      Icon = AlertCircle;
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${colors}`}>
        <Icon size={12} className={status === 'EM ANDAMENTO' ? 'animate-spin-slow' : ''} />
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">Gestão de Ativos</h1>
              <p className="text-slate-500 text-sm mt-1">Hierarquia & Transição de Status (Equatorial)</p>
            </div>
          </div>
        </header>

        {/* Tab Selection */}
        <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit mb-8 border border-white/50 shadow-sm">
          <button 
            onClick={() => setActiveTab('ANUENCIA')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'ANUENCIA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ClipboardList size={18} />
            Módulo ANUENCIA
          </button>
          <button 
            onClick={() => setActiveTab('TRAVESSIA')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'TRAVESSIA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ArrowRightLeft size={18} />
            Módulo TRAVESSIA
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'ANUENCIA' ? (
              <motion.div 
                key="anuencia"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hierarquia: Inscrição {'>'} Projeto</span>
                    <button className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
                      <Plus size={14} /> Nova Inscrição
                    </button>
                  </div>

                  {anuenciaData.map(ins => (
                    <div key={ins.id} className="border-b last:border-0 border-slate-100">
                      <div 
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                        onClick={() => toggleExpand(ins.id)}
                      >
                        <div className="flex items-center gap-4">
                          {expandedItems.has(ins.id) ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                          <div>
                            <h3 className="font-semibold text-slate-800">{ins.name}</h3>
                            <p className="text-xs text-slate-400 font-mono tracking-tighter">ID: {ins.id}</p>
                          </div>
                        </div>
                        <StatusBadge status={ins.status} />
                      </div>

                      <AnimatePresence>
                        {expandedItems.has(ins.id) && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-slate-50/30 px-5 pb-5 pt-0"
                          >
                            <div className="ml-9 border-l-2 border-slate-100 pl-6 space-y-3">
                              {ins.projects.map(proj => (
                                <div key={proj.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <FileText size={16} className="text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">{proj.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <StatusBadge status={proj.status} />
                                    <select 
                                      value={proj.status}
                                      onChange={(e) => updateAnuenciaProjectStatus(ins.id, proj.id, e.target.value as AnuenciaProjectStatus)}
                                      className="text-xs border-none bg-slate-100 rounded px-2 py-1 outline-none text-slate-600 font-medium cursor-pointer hover:bg-slate-200 transition-colors"
                                    >
                                      {Object.values(AnuenciaProjectStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ))}
                              <button 
                                onClick={() => addAnuenciaProject(ins.id)}
                                className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors mt-2"
                              >
                                <Plus size={14} /> Adicionar Projeto
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="travessia"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hierarquia: Inscrição {'>'} Projeto {'>'} Protocolo</span>
                  </div>

                  {travessiaData.map(ins => (
                    <div key={ins.id} className="border-b last:border-0 border-slate-100">
                      <div 
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50"
                        onClick={() => toggleExpand(ins.id)}
                      >
                        <div className="flex items-center gap-4">
                          {expandedItems.has(ins.id) ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                          <div>
                            <h3 className="font-semibold text-slate-800">{ins.name}</h3>
                            <p className="text-xs text-slate-400 font-mono tracking-tighter">ID: {ins.id}</p>
                          </div>
                        </div>
                        <StatusBadge status={ins.status} />
                      </div>

                      <AnimatePresence>
                        {expandedItems.has(ins.id) && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-50/30 px-5 pb-5 pt-0 overflow-hidden"
                          >
                            <div className="ml-9 border-l-2 border-slate-100 pl-6 space-y-4 pt-2">
                              {ins.projects.map(proj => (
                                <div key={proj.id} className="space-y-3">
                                  <div 
                                    className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm cursor-pointer hover:border-blue-200 transition-colors"
                                    onClick={() => toggleExpand(proj.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {expandedItems.has(proj.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                      <span className="text-sm font-bold text-slate-700">{proj.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <StatusBadge status={proj.status} />
                                      <select 
                                        value={proj.status}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => updateTravessiaProjectStatusManually(ins.id, proj.id, e.target.value as TravessiaProjectStatus)}
                                        className="text-[10px] border-none bg-slate-100 rounded px-1.5 py-0.5 outline-none text-slate-500 font-bold uppercase tracking-tight cursor-pointer"
                                      >
                                        {Object.values(TravessiaProjectStatus).map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <AnimatePresence>
                                    {expandedItems.has(proj.id) && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="ml-6 border-l-2 border-slate-200/50 pl-5 space-y-2 overflow-hidden"
                                      >
                                        {proj.protocols.map(proto => (
                                          <div key={proto.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-200/20 rounded-lg border border-transparent hover:border-slate-300 transition-all">
                                            <div className="flex items-center gap-2 text-slate-600">
                                              <ArrowRightLeft size={14} className="text-slate-300" />
                                              {proto.name}
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <StatusBadge status={proto.status} />
                                              <select 
                                                value={proto.status}
                                                onChange={(e) => updateTravessiaProtocolStatus(ins.id, proj.id, proto.id, e.target.value as TravessiaProtocolStatus)}
                                                className="text-[9px] font-bold border-none bg-white rounded px-1 py-0.5 outline-none text-blue-600"
                                              >
                                                {Object.values(TravessiaProtocolStatus).map(s => (
                                                  <option key={s} value={s}>{s}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>
                                        ))}
                                        <button 
                                          onClick={() => addTravessiaProtocol(ins.id, proj.id)}
                                          className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-blue-500 transition-colors ml-1"
                                        >
                                          <Plus size={12} /> NOVO PROTOCOLO
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <section className="mt-12 p-6 bg-blue-900 text-blue-100 rounded-3xl shadow-xl border border-blue-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle size={20} /> Regras de Negócio Aplicadas
            </h2>
            <div className="grid md:grid-cols-2 gap-8 text-sm opacity-90">
              <div className="space-y-2">
                <h3 className="font-bold border-b border-blue-700 pb-1 mb-2">ANUENCIA</h3>
                <p>• <span className="font-bold text-white">APROVADO:</span> Se TODOS os projetos forem &quot;ATENDIDO&quot;.</p>
                <p>• <span className="font-bold text-white">EM ANDAMENTO:</span> Se pelo menos UM projeto for &quot;NEGADO&quot; ou &quot;DUP&quot;.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold border-b border-blue-700 pb-1 mb-2">TRAVESSIA</h3>
                <p>• <span className="font-bold text-white">PROJETO APROVADO:</span> Se TODOS os protocolos forem &quot;APROVADO&quot;.</p>
                <p>• <span className="font-bold text-white">INSCRIÇÃO EM ANDAMENTO:</span> Se UM projeto for &quot;PROTOCOLADO&quot;, &quot;TAXA&quot;, etc.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
