import React, { useEffect, useState } from 'react';
import {
  BookOpen, Users, FileText, LogOut, Shield, X, ArrowRight, Building,
  PlusCircle, Activity, Eye, ChevronRight, Menu,
} from 'lucide-react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FooterGlobale } from '../components/FooterGlobale';
import { BadgeMatiere } from '../components/BadgeMatiere';
import type { Ecole, EleveActif, Groupe, ProfProfil } from '../types';

function genererCodesProfs(prefixe: string, nombre: number): string[] {
  return Array.from({ length: nombre }, (_, i) => `${prefixe}-PROF-${(i + 1).toString().padStart(2, '0')}`);
}

export function DashboardAdmin({ surDeconnexion, onImpersonate }: { surDeconnexion: () => void; onImpersonate: (uid: string, email: string) => void }) {
  const [vueCourante, setVueCourante] = useState<'ecoles' | 'profs' | 'groupes' | 'eleves' | 'resultats' | 'stats'>('ecoles');
  const [menuOuvert, setMenuOuvert] = useState(false);

  const [ecoleActive, setEcoleActive] = useState<Ecole | null>(null);
  const [profActif, setProfActif] = useState<ProfProfil | null>(null);
  const [groupeActif, setGroupeActif] = useState<Groupe | null>(null);
  const [eleveActif, setEleveActif] = useState<EleveActif | null>(null);

  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [profs, setProfs] = useState<ProfProfil[]>([]);
  const [groupesAdmin, setGroupesAdmin] = useState<Groupe[]>([]);
  const [resultatsGlobaux, setResultatsGlobaux] = useState<any[]>([]);

  const [nomEcole, setNomEcole] = useState('');
  const [prefixe, setPrefixe] = useState('');
  const [nbProfs, setNbProfs] = useState<number>(10);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [modalCodesEcole, setModalCodesEcole] = useState<Ecole | null>(null);

  async function chargerDonnees() {
    const snapEcoles = await getDocs(collection(db, 'codes_ecole'));
    const snapGroupes = await getDocs(collection(db, 'groupes'));
    const snapProfs = await getDocs(collection(db, 'profs'));
    const snapRes = await getDocs(collection(db, 'resultats_eleves'));

    const profsList = snapProfs.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const groupesList = snapGroupes.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    setProfs(profsList);
    setGroupesAdmin(groupesList);
    setResultatsGlobaux(snapRes.docs.map(d => ({ id: d.id, ...(d.data() as any) })));

    setEcoles(snapEcoles.docs.map(d => {
      const e = { id: d.id, ...(d.data() as any) };
      const grps = groupesList.filter(g => (g.prefixeBase || '').startsWith(`${e.prefixe}-`));
      return { ...e, nbGroupes: grps.length };
    }));
  }

  useEffect(() => { chargerDonnees(); }, []);

  async function ajouterEcole(e: React.FormEvent) {
    e.preventDefault();
    if (!nomEcole.trim() || prefixe.length !== 3) return;
    await addDoc(collection(db, 'codes_ecole'), { nom: nomEcole.trim(), prefixe: prefixe.toUpperCase(), codesProfs: genererCodesProfs(prefixe.toUpperCase(), nbProfs) });
    setNomEcole(''); setPrefixe(''); setNbProfs(10); setShowCreationModal(false); chargerDonnees();
  }

  const navVersEcoles = () => { setVueCourante('ecoles'); setEcoleActive(null); setProfActif(null); setGroupeActif(null); setEleveActif(null); setMenuOuvert(false); };
  const navVersStats = () => { setVueCourante('stats'); setMenuOuvert(false); };
  const navVersProfs = (ecole: Ecole) => { setEcoleActive(ecole); setVueCourante('profs'); setProfActif(null); setGroupeActif(null); setEleveActif(null); };
  const navVersGroupes = (prof: ProfProfil) => { setProfActif(prof); setVueCourante('groupes'); setGroupeActif(null); setEleveActif(null); };
  const navVersEleves = (groupe: Groupe) => { setGroupeActif(groupe); setVueCourante('eleves'); setEleveActif(null); };
  const navVersResultats = (eleve: EleveActif) => { setEleveActif(eleve); setVueCourante('resultats'); };

  const profsFiltres = profs.filter(p => p.ecoleId === ecoleActive?.id);
  const groupesFiltres = groupesAdmin.filter(g => g.profId === profActif?.uid);
  const resultatsEleve = resultatsGlobaux.filter(r => r.codeUtilise === eleveActif?.code && r.eleve === eleveActif?.nom).sort((a, b) => (b.horodatage?.seconds || 0) - (a.horodatage?.seconds || 0));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-800 z-20">
        <div className="p-4 md:p-6 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="text-indigo-400" /> Espace Admin</h1>
          <button className="md:hidden p-2 rounded hover:bg-slate-800" onClick={() => setMenuOuvert(!menuOuvert)}><Menu className="h-6 w-6" /></button>
        </div>
        <nav className={`flex-1 p-4 space-y-2 ${menuOuvert ? 'block' : 'hidden md:block'} overflow-y-auto`}>
          <button onClick={navVersEcoles} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${vueCourante !== 'stats' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Building className="h-5 w-5" /> Établissements</button>
          <button onClick={navVersStats} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${vueCourante === 'stats' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Activity className="h-5 w-5" /> Global (Stats)</button>
          <div className="pt-6">
            <button onClick={surDeconnexion} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><LogOut className="h-5 w-5" /> Déconnexion</button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-500 overflow-x-auto whitespace-nowrap hide-scrollbar">
            {vueCourante === 'stats' ? (
              <span className="font-bold text-slate-900">Toutes les statistiques</span>
            ) : (
              <>
                <button onClick={navVersEcoles} className="hover:text-indigo-600 flex items-center gap-1"><Building className="h-4 w-4 hidden md:inline-block" /> Écoles</button>
                {ecoleActive && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0" /><button onClick={() => navVersProfs(ecoleActive)} className="hover:text-indigo-600 truncate max-w-[120px] md:max-w-[150px]">{ecoleActive.nom}</button></>}
                {profActif && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0" /><button onClick={() => navVersGroupes(profActif)} className="hover:text-indigo-600 truncate max-w-[120px] md:max-w-[200px]">{profActif.email}</button></>}
                {groupeActif && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0" /><button onClick={() => navVersEleves(groupeActif)} className="hover:text-indigo-600 truncate max-w-[120px] md:max-w-[150px]">{groupeActif.nom}</button></>}
                {eleveActif && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0" /><span className="text-slate-900 font-bold truncate max-w-[120px] md:max-w-[150px]">{eleveActif.nom}</span></>}
              </>
            )}
          </div>
          {vueCourante === 'ecoles' && (
            <button onClick={() => setShowCreationModal(true)} className="flex items-center gap-1 md:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm shrink-0"><PlusCircle className="h-4 w-4" /> <span className="hidden md:inline">Nouvelle école</span></button>
          )}
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50 pb-20">

          {vueCourante === 'ecoles' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="px-6 py-4">Établissement</th><th className="px-6 py-4">Préfixe</th><th className="px-6 py-4 text-center">Groupes</th><th className="px-6 py-4 text-right">Codes / Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {ecoles.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{e.nom}</td>
                      <td className="px-6 py-4 font-mono text-indigo-600 bg-indigo-50 inline-block mt-3 ml-6 px-2 py-0.5 rounded">{e.prefixe}</td>
                      <td className="px-6 py-4 text-center text-slate-600 font-medium">{e.nbGroupes}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-4">
                          <button onClick={() => setModalCodesEcole(e)} className="text-xs font-medium text-slate-500 hover:text-slate-800 underline">{Object.keys(e.codesProfsUtilises || {}).length}/{e.codesProfs?.length} activés</button>
                          <button onClick={() => navVersProfs(e)} className="bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 md:px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">Profs <ArrowRight className="h-4 w-4 hidden md:block" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ecoles.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-500">Aucune école. Créez-en une pour commencer.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {vueCourante === 'stats' && (
            <div>
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Activity className="h-6 w-6 text-indigo-500" /> Toutes les statistiques</h2>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 border-b">Date</th>
                      <th className="px-4 py-3 border-b">Élève</th>
                      <th className="px-4 py-3 border-b">Code d'accès</th>
                      <th className="px-4 py-3 border-b">Opération évaluée</th>
                      <th className="px-4 py-3 border-b">Résultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultatsGlobaux.sort((a, b) => (b.horodatage?.seconds || 0) - (a.horodatage?.seconds || 0)).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">{r.horodatage?.seconds ? new Date(r.horodatage.seconds * 1000).toLocaleString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{r.eleve}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600">{r.codeUtilise}</td>
                        <td className="px-4 py-3 text-slate-700">{r.operation}</td>
                        <td className="px-4 py-3 font-bold">{r.resultat}</td>
                      </tr>
                    ))}
                    {resultatsGlobaux.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">Aucun résultat enregistré globalement.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vueCourante === 'profs' && ecoleActive && (
            <div>
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Users className="h-6 w-6 text-indigo-500" /> Professeurs ({ecoleActive.nom})</h2>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="px-6 py-4">Courriel</th><th className="px-6 py-4">Code d'activation</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {profsFiltres.map(p => {
                      const nbGroupesDuProf = groupesAdmin.filter(g => g.profId === p.uid).length;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{p.email}</td>
                          <td className="px-6 py-4 font-mono text-slate-500">{p.codeUtilise}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-3">
                              <button onClick={() => onImpersonate(p.uid, p.email)} className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 flex items-center gap-1"><Eye className="h-3 w-3" /> Voir comme</button>
                              <button onClick={() => navVersGroupes(p)} className="bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 md:px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">Groupes ({nbGroupesDuProf}) <ArrowRight className="h-4 w-4 hidden md:block" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {profsFiltres.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-slate-500">Aucun professeur inscrit pour cette école.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vueCourante === 'groupes' && profActif && (
            <div>
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><BookOpen className="h-6 w-6 text-indigo-500" /> Groupes de {profActif.email}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupesFiltres.map(g => {
                  const nbUtilises = Object.keys(g.codesUtilises || {}).length;
                  const totalCodes = g.codes?.length || 0;
                  return (
                    <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full">
                      <div className="mb-2"><BadgeMatiere matiereId={g.matiereId} /></div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{g.nom}</h3>
                      <div className="text-sm font-mono text-slate-500 mb-4">{g.prefixeBase}</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${totalCodes > 0 ? (nbUtilises / totalCodes) * 100 : 0}%` }}></div></div>
                      <div className="text-xs text-slate-500 mb-6">{nbUtilises} élèves inscrits sur {totalCodes} codes</div>
                      <button onClick={() => navVersEleves(g)} className="mt-auto w-full bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">Dossiers des élèves <ArrowRight className="h-4 w-4" /></button>
                    </div>
                  );
                })}
                {groupesFiltres.length === 0 && <div className="col-span-full text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">Ce professeur n'a pas encore créé de groupe.</div>}
              </div>
            </div>
          )}

          {vueCourante === 'eleves' && groupeActif && (
            <div>
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Users className="h-6 w-6 text-indigo-500" /> Élèves inscrits ({groupeActif.nom})</h2>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="px-6 py-4">Nom de l'élève</th><th className="px-6 py-4">Courriel</th><th className="px-6 py-4">Code d'accès</th><th className="px-6 py-4 text-center">Exercices</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(groupeActif.codesUtilises || {}).map(([code, eleveData]: any) => {
                      const nbResultats = resultatsGlobaux.filter(r => r.codeUtilise === code && r.eleve === eleveData.nom).length;
                      return (
                        <tr key={code} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{eleveData.nom}</td>
                          <td className="px-6 py-4 text-slate-600">{eleveData.email}</td>
                          <td className="px-6 py-4 font-mono text-slate-400">{code}</td>
                          <td className="px-6 py-4 text-center font-bold text-indigo-600">{nbResultats}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => navVersResultats({ ...eleveData, code })} className="bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 md:px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex ml-auto items-center gap-2">Dossier <FileText className="h-4 w-4 hidden md:block" /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {Object.keys(groupeActif.codesUtilises || {}).length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">Aucun élève n'a encore activé son code dans ce groupe.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vueCourante === 'resultats' && eleveActif && (
            <div>
              <h2 className="text-xl font-bold mb-2 text-slate-800 flex items-center gap-2"><FileText className="h-6 w-6 text-indigo-500" /> Dossier complet de {eleveActif.nom}</h2>
              <p className="text-slate-500 mb-6 font-mono text-sm">Code : {eleveActif.code}</p>

              <div className="space-y-4">
                {resultatsEleve.map((r, i) => {
                  const isReussi = String(r.resultat).toLowerCase().includes('réussi') || r.note === '2/2' || r.note === '1/1';
                  const dateFormatee = r.horodatage?.seconds ? new Date(r.horodatage.seconds * 1000).toLocaleString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date inconnue';
                  return (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                      <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isReussi ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isReussi ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{r.section}</span>
                            <span className="text-sm font-bold text-slate-800">{r.operation}</span>
                          </div>
                          <div className="text-xs text-slate-500">{dateFormatee}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-sm ${isReussi ? 'text-emerald-600' : 'text-amber-600'}`}>{r.resultat}</span>
                          <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm font-bold text-slate-700 shadow-sm">{r.note}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Question / Consigne</div>
                          <p className="text-sm text-slate-700 leading-relaxed italic border-l-2 border-slate-200 pl-3">{r.consigne}</p>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Réponse soumise</div>
                          <p className="text-sm text-slate-900 leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{r.reponse}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {resultatsEleve.length === 0 && <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">L'élève n'a soumis aucune réponse pour le moment.</div>}
              </div>
            </div>
          )}

        </div>
        <FooterGlobale />
      </main>

      {/* MODALS ADMIN */}
      {showCreationModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Créer une école</h2>
            <form onSubmit={ajouterEcole} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom / Commission Scolaire</label><input type="text" required value={nomEcole} onChange={e => setNomEcole(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-sm font-medium text-slate-700 mb-1">Préfixe (3 lettres)</label><input type="text" required maxLength={3} minLength={3} value={prefixe} onChange={e => setPrefixe(e.target.value.toUpperCase())} className="w-full border border-slate-300 p-2.5 rounded-lg font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="ABC" /></div>
                <div className="w-1/3"><label className="block text-sm font-medium text-slate-700 mb-1">Nb Profs</label><input type="number" min="1" max="100" value={nbProfs} onChange={e => setNbProfs(Number(e.target.value))} className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCreationModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-sm">Générer les codes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCodesEcole && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div><h2 className="font-bold text-xl text-slate-800">{modalCodesEcole.nom}</h2><p className="text-sm font-mono text-indigo-600">{modalCodesEcole.prefixe}</p></div>
              <button onClick={() => setModalCodesEcole(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-auto flex-1 space-y-2 pr-2">
              {(modalCodesEcole.codesProfs || []).map(c => {
                const utilise = modalCodesEcole.codesProfsUtilises?.[c];
                return (
                  <div key={c} className={`p-3 border rounded-lg flex justify-between items-center ${utilise ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                    <span className={`font-mono text-sm ${utilise ? 'text-slate-400 line-through' : 'text-slate-700 font-bold'}`}>{c}</span>
                    {utilise ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{utilise.email}</span> : <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">Libre</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
