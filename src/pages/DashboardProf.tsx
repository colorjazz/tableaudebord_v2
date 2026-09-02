import { useEffect, useState } from 'react';
import {
  BookOpen, Users, Activity, LogOut, Eye, X, Loader2, Menu,
} from 'lucide-react';
import {
  collection, getDocs, addDoc, serverTimestamp, query, where, doc, updateDoc, getDoc,
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { db, auth } from '../firebase';
import { FooterGlobale } from '../components/FooterGlobale';
import { BadgeMatiere } from '../components/BadgeMatiere';
import { callAppsScript } from '../lib/appsScript';
import { getMatiere, matieresActives, MATIERE_PAR_DEFAUT } from '../config/matieres';
import type { Groupe } from '../types';

export function DashboardProf({ user, surDeconnexion, modeImpersonation = false }: { user: User; surDeconnexion: () => void, modeImpersonation?: boolean }) {
  const [activeTab, setActiveTab] = useState<'groupes' | 'statistiques'>('groupes');
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [resultats, setResultats] = useState<any[]>([]);

  const [profEcolePrefixe, setProfEcolePrefixe] = useState('');
  const [isPrefixeEditable, setIsPrefixeEditable] = useState(false);

  const [nouveauGroupeNom, setNouveauGroupeNom] = useState('');
  const [prefixeGroupe, setPrefixeGroupe] = useState('');
  const [nbEleves, setNbEleves] = useState<number>(30);
  const [matiereChoisie, setMatiereChoisie] = useState<string>(MATIERE_PAR_DEFAUT);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [groupeDetail, setGroupeDetail] = useState<Groupe | null>(null);

  const [activeModalTab, setActiveModalTab] = useState<'unites' | 'codes'>('unites');
  const [groupeFiltre, setGroupeFiltre] = useState<string>('Tous');
  const [eleveBilanDetail, setEleveBilanDetail] = useState<{ nom: string, groupe: string, resultats: any[], bilan: string, loading: boolean } | null>(null);

  const matieresDisponibles = matieresActives();

  async function chargerDonnees() {
    const snapEcoles = await getDocs(collection(db, 'codes_ecole'));
    const ecolesData = snapEcoles.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const snapGroupes = await getDocs(query(collection(db, 'groupes'), where('profId', '==', user.uid)));
    const listeGroupes = snapGroupes.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Groupe[];
    listeGroupes.sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0));
    const groupesMigres = listeGroupes.map(g => ({
      ...g,
      periodesDebloquees: g.periodesDebloquees || getMatiere(g.matiereId).unites.map(u => u.id),
    }));
    setGroupes(groupesMigres);

    let detectedPrefix = '';
    try {
      const profSnap = await getDoc(doc(db, 'profs', user.uid));
      if (profSnap.exists()) {
        const pData = profSnap.data();
        const monEcole = ecolesData.find((e: any) => e.id === pData.ecoleId);
        if (monEcole && (monEcole as any).prefixe) {
          detectedPrefix = (monEcole as any).prefixe;
        } else if (pData.codeUtilise) {
          detectedPrefix = pData.codeUtilise.split('-')[0];
        }
      }
    } catch (e) { console.error("Erreur détection", e); }

    if (!detectedPrefix && listeGroupes.length > 0) {
      const g = listeGroupes.find(gr => gr.prefixeBase);
      if (g) detectedPrefix = g.prefixeBase.split('-')[0];
    }

    if (detectedPrefix) {
      setProfEcolePrefixe(detectedPrefix);
      setIsPrefixeEditable(false);
    } else {
      setProfEcolePrefixe('');
      setIsPrefixeEditable(true);
    }

    const snapResultats = await getDocs(collection(db, 'resultats_eleves'));
    setResultats(snapResultats.docs.map(d => d.data()));
  }

  useEffect(() => { chargerDonnees(); }, []);

  const limiteGroupesAtteinte = groupes.length >= 6;

  async function creerGroupe() {
    if (limiteGroupesAtteinte || !nouveauGroupeNom.trim() || !profEcolePrefixe.trim() || !prefixeGroupe.trim()) return;
    setCreationEnCours(true);
    try {
      const g = prefixeGroupe.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const base = `${profEcolePrefixe.toUpperCase()}-${g}`;
      const listeCodes = Array.from({ length: nbEleves }, (_, i) => `${base}-${(i + 1).toString().padStart(2, '0')}`);
      const matiere = getMatiere(matiereChoisie);
      await addDoc(collection(db, 'groupes'), {
        nom: nouveauGroupeNom.trim(), prefixeBase: base, codes: listeCodes, profId: user.uid,
        matiereId: matiere.id, dateCreation: serverTimestamp(), periodesDebloquees: matiere.unites.map(u => u.id),
      });
      setNouveauGroupeNom(''); setPrefixeGroupe(''); setShowCodeModal(false); chargerDonnees();
    } catch (err) { } finally { setCreationEnCours(false); }
  }

  async function toggleUnite(groupeId: string, uniteId: number, currentList: number[]) {
    let newList = [...currentList];
    if (newList.includes(uniteId)) {
      if (newList.length === 1) return;
      newList = newList.filter(id => id !== uniteId);
    } else { newList.push(uniteId); }
    newList.sort((a, b) => a - b);
    try {
      await updateDoc(doc(db, 'groupes', groupeId), { periodesDebloquees: newList });
      setGroupes(prev => prev.map(g => g.id === groupeId ? { ...g, periodesDebloquees: newList } : g));
      if (groupeDetail && groupeDetail.id === groupeId) setGroupeDetail({ ...groupeDetail, periodesDebloquees: newList });
    } catch (e) { }
  }

  const genererStatistiques = () => {
    let stats: any[] = [];
    groupes.forEach(g => {
      if (groupeFiltre !== 'Tous' && g.id !== groupeFiltre) return;
      Object.values(g.codesUtilises || {}).forEach(eleve => {
        const resEleve = resultats.filter(r => r.codeUtilise && g.codes?.includes(r.codeUtilise) && r.eleve === eleve.nom);
        const nbTotal = resEleve.length;
        const nbReussis = resEleve.filter(r => r.resultat === 'Réussi' || r.note === '2/2' || r.note === '1/1' || String(r.resultat).includes('Réussi')).length;
        const taux = nbTotal > 0 ? Math.round((nbReussis / nbTotal) * 100) : 0;
        let couleur = "bg-red-500";
        if (taux >= 75) couleur = "bg-emerald-500"; else if (taux >= 50) couleur = "bg-amber-400";
        stats.push({ nom: eleve.nom, groupe: g.nom, matiereId: g.matiereId, nbTotal, taux, couleur, resultatsEleve: resEleve });
      });
    });
    return stats.sort((a, b) => a.groupe.localeCompare(b.groupe) || a.nom.localeCompare(b.nom));
  };

  async function genererBilan(statEleve: any) {
    setEleveBilanDetail({ nom: statEleve.nom, groupe: statEleve.groupe, resultats: statEleve.resultatsEleve, bilan: "", loading: true });
    if (!statEleve.resultatsEleve || statEleve.resultatsEleve.length === 0) {
      setEleveBilanDetail(prev => prev ? { ...prev, loading: false, bilan: "Cet élève n'a pas encore fait d'exercices." } : null);
      return;
    }
    const matiere = getMatiere(statEleve.matiereId);
    const infos = statEleve.resultatsEleve.map((r: any) => `Opération: ${r.operation}, Note: ${r.note}, Verdict: ${r.resultat}`).join(" | ");
    const prompt = `Tu es ${matiere.contextePourBilanIA}. Voici l'historique récent de l'élève ${statEleve.nom} : ${infos}. Fais un bilan direct (3-4 phrases maximum) de ses forces et indique 1 ou 2 points précis à travailler. Sois encourageant. Pas de balises markdown.`;

    try {
      const resp = await callAppsScript('generer', { prompt });
      let texte = resp.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      setEleveBilanDetail(prev => prev ? { ...prev, loading: false, bilan: texte } : null);
    } catch (e) {
      setEleveBilanDetail(prev => prev ? { ...prev, loading: false, bilan: "Erreur lors de la génération du bilan. Veuillez réessayer." } : null);
    }
  }

  const peutCreerGroupe = !creationEnCours && nouveauGroupeNom.trim() !== '' && prefixeGroupe.trim() !== '' && profEcolePrefixe.trim() !== '';
  const uniteesDuGroupeDetail = groupeDetail ? getMatiere(groupeDetail.matiereId).unites : [];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {modeImpersonation && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white px-4 py-2 text-sm font-bold flex justify-between z-50 shadow-md">
          <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Mode Impersonation actif : Compte de {user.email}</span>
          <button onClick={surDeconnexion} className="underline hover:text-red-200">Quitter et retourner à l'Admin</button>
        </div>
      )}

      <aside className={`w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 z-20 ${modeImpersonation ? 'md:mt-10' : ''}`}>
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-200">
          <div className="text-indigo-600 font-bold text-xl flex items-center gap-2"><BookOpen className="h-6 w-6" /> Corrige.moi</div>
          <button className="md:hidden p-2 rounded hover:bg-slate-100" onClick={() => setMenuOuvert(!menuOuvert)}><Menu className="h-6 w-6" /></button>
        </div>
        <nav className={`flex-1 p-4 space-y-2 ${menuOuvert ? 'block' : 'hidden md:block'} overflow-y-auto`}>
          <button onClick={() => { setActiveTab('groupes'); setMenuOuvert(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'groupes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Users className="h-5 w-5" /> Mes Groupes ({groupes.length}/6)</button>
          <button onClick={() => { setActiveTab('statistiques'); setMenuOuvert(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'statistiques' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Activity className="h-5 w-5" /> Statistiques élèves</button>
          {!modeImpersonation && (
            <div className="pt-6 md:hidden">
              <button onClick={surDeconnexion} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700"><LogOut className="h-5 w-5" /> Déconnexion</button>
            </div>
          )}
        </nav>
        {!modeImpersonation && (
          <div className="p-4 border-t border-slate-200 hidden md:block">
            <div className="px-4 pb-2 text-xs text-slate-400 truncate">{user.email}</div>
            <button onClick={surDeconnexion} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"><LogOut className="h-5 w-5" /> Déconnexion</button>
          </div>
        )}
      </aside>

      <main className={`flex-1 flex flex-col h-full overflow-hidden relative ${modeImpersonation ? 'md:mt-10' : ''}`}>
        {activeTab === 'groupes' && (
          <>
            <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 flex items-center justify-between shrink-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">Mes Groupes</h1>
              <button onClick={() => setShowCodeModal(true)} disabled={limiteGroupesAtteinte} className="px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors">+ Générer des codes</button>
            </header>
            <div className="flex-1 overflow-auto p-4 md:p-8 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {groupes.map(g => {
                  const nbUtilises = Object.keys(g.codesUtilises || {}).length;
                  const totalCodes = g.codes?.length || 0;
                  return (
                    <button key={g.id} onClick={() => { setGroupeDetail(g); setActiveModalTab('unites'); }} className="text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                      <div className="mb-2"><BadgeMatiere matiereId={g.matiereId} /></div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{g.nom}</h3>
                      <div className="text-sm font-mono text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mb-4">{g.prefixeBase}</div>
                      <div className="text-sm text-slate-500 mb-2">{nbUtilises}/{totalCodes} codes attribués</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${totalCodes > 0 ? (nbUtilises / totalCodes) * 100 : 0}%` }}></div></div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'statistiques' && (
          <>
            <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">Statistiques globales</h1>
              <select value={groupeFiltre} onChange={(e) => setGroupeFiltre(e.target.value)} className="w-full md:w-auto border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50">
                <option value="Tous">Tous les groupes</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </header>
            <div className="flex-1 overflow-auto p-4 md:p-8 pb-20">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr><th className="px-4 md:px-6 py-4 border-b">Élève</th><th className="px-4 md:px-6 py-4 border-b">Groupe</th><th className="px-4 md:px-6 py-4 border-b text-center">Exercices</th><th className="px-4 md:px-6 py-4 border-b text-center">Réussite</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {genererStatistiques().map((stat, i) => (
                      <tr key={i} onClick={() => genererBilan(stat)} className="hover:bg-indigo-50 cursor-pointer transition-colors group">
                        <td className="px-4 md:px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${stat.couleur} shadow-sm shrink-0`}></div>
                          {stat.nom}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-slate-600">{stat.groupe}</td>
                        <td className="px-4 md:px-6 py-4 text-center font-bold text-slate-700">{stat.nbTotal}</td>
                        <td className="px-4 md:px-6 py-4 text-center">
                          <span className="bg-slate-100 group-hover:bg-white px-3 py-1 rounded-full text-slate-700 font-medium transition-colors border border-slate-200 group-hover:border-indigo-200">{stat.taux} %</span>
                        </td>
                      </tr>
                    ))}
                    {genererStatistiques().length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Aucun résultat trouvé pour ce groupe.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-slate-500 mt-4 italic">Astuce : Cliquez sur un élève pour générer un diagnostic du modèle de langage sur ses forces et faiblesses.</p>
            </div>
          </>
        )}
        <FooterGlobale />
      </main>

      {/* MODAL CODES */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Générer des codes élèves</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
                <select value={matiereChoisie} onChange={e => setMatiereChoisie(e.target.value)} className="w-full border p-2 rounded-lg h-[42px] bg-white">
                  {matieresDisponibles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'affichage</label>
                <input type="text" placeholder="Ex: Histoire 401" value={nouveauGroupeNom} onChange={e => setNouveauGroupeNom(e.target.value)} className="w-full border p-2 rounded-lg" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
                  {isPrefixeEditable ? (
                    <input type="text" maxLength={3} placeholder="ABC" value={profEcolePrefixe} onChange={e => setProfEcolePrefixe(e.target.value.toUpperCase())} className="w-full border border-indigo-300 p-2 rounded-lg font-mono uppercase h-[42px] focus:ring-2 focus:ring-indigo-500 outline-none" />
                  ) : (
                    <div className="w-full border p-2 rounded-lg bg-slate-100 text-slate-500 font-mono flex items-center h-[42px]">
                      {profEcolePrefixe}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Numéro du groupe</label>
                  <input type="text" maxLength={4} placeholder="Ex: 401" value={prefixeGroupe} onChange={e => setPrefixeGroupe(e.target.value.toUpperCase())} className="w-full border p-2 rounded-lg uppercase font-mono h-[42px]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre d'élèves</label>
                <input type="number" min="1" max="40" placeholder="Nb élèves" value={nbEleves} onChange={e => setNbEleves(Number(e.target.value))} className="w-full border p-2 rounded-lg h-[42px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-2">
                <button onClick={() => setShowCodeModal(false)} className="px-5 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-medium">Annuler</button>
                <button onClick={creerGroupe} disabled={!peutCreerGroupe} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed">{creationEnCours ? 'Création...' : 'Créer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL GROUPE */}
      {groupeDetail && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between shrink-0 bg-white">
              <div>
                <div className="mb-1"><BadgeMatiere matiereId={groupeDetail.matiereId} /></div>
                <h2 className="text-xl font-bold text-slate-900">{groupeDetail.nom}</h2>
                <p className="text-sm font-mono text-indigo-600">{groupeDetail.prefixeBase}</p>
              </div>
              <button onClick={() => setGroupeDetail(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 px-4 md:px-6 pt-2 shrink-0 overflow-x-auto hide-scrollbar">
              <button onClick={() => setActiveModalTab('unites')} className={`px-4 md:px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeModalTab === 'unites' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Unités déverrouillées</button>
              <button onClick={() => setActiveModalTab('codes')} className={`px-4 md:px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeModalTab === 'codes' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Codes élèves</button>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 bg-white">
              {activeModalTab === 'unites' && (
                <div>
                  <label className="block text-sm text-slate-500 mb-4">Cochez les unités auxquelles vos élèves auront accès pour s'exercer.</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uniteesDuGroupeDetail.map(u => {
                      const estCochee = (groupeDetail.periodesDebloquees || []).includes(u.id);
                      return (
                        <label key={u.id} className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${estCochee ? 'bg-indigo-50/50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                          <input type="checkbox" checked={estCochee} onChange={() => toggleUnite(groupeDetail.id, u.id, groupeDetail.periodesDebloquees || [])} className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                          <span className={`text-sm font-medium leading-snug ${estCochee ? 'text-indigo-900' : 'text-slate-600'}`}>{u.titre.includes(' : ') ? u.titre.split(' : ')[1] : u.titre}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeModalTab === 'codes' && (
                <div className="space-y-2">
                  {(groupeDetail.codes || []).map(code => {
                    const utilise = groupeDetail.codesUtilises?.[code];
                    return (
                      <div key={code} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border ${utilise ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <span className={`font-mono text-sm font-medium mb-2 sm:mb-0 ${utilise ? 'line-through text-slate-400' : 'text-slate-700'}`}>{code}</span>
                        {utilise ? (
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <span className="text-sm font-medium text-emerald-800">{utilise.nom}</span>
                            <button onClick={() => sendPasswordResetEmail(auth, utilise.email).then(() => alert("Courriel de réinitialisation envoyé !"))} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg shadow-sm">Mot de passe oublié ?</button>
                          </div>
                        ) : <span className="text-xs text-slate-400 font-medium uppercase tracking-wider bg-white px-2 py-1 rounded border border-slate-100">Non attribué</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL BILAN IA ÉLÈVE */}
      {eleveBilanDetail && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{eleveBilanDetail.nom}</h2>
                <p className="text-sm font-medium text-slate-500">{eleveBilanDetail.groupe}</p>
              </div>
              <button onClick={() => setEleveBilanDetail(null)} className="p-2 bg-white hover:bg-slate-100 text-slate-500 rounded-lg shadow-sm border border-slate-200"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl"><Activity className="h-5 w-5" /></div>
                <h3 className="text-lg font-bold text-slate-800">Diagnostic du modèle de langage</h3>
              </div>
              {eleveBilanDetail.loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-500" />
                  <p className="text-sm font-medium">Analyse des {eleveBilanDetail.resultats.length} exercices en cours...</p>
                </div>
              ) : (
                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 relative">
                  <div className="absolute -top-3 -left-3 text-4xl opacity-20">✨</div>
                  <p className="text-slate-800 leading-relaxed text-[15px] relative z-10 font-medium">
                    {eleveBilanDetail.bilan}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
