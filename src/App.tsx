import React, { useState, useEffect } from 'react';
import {
  BookOpen, Users, Settings, Key, Search, FileText,
  CheckCircle, AlertCircle, LogOut, Shield, X, RefreshCw, Loader2,
  Lock, Mail, ArrowRight, User as UserIcon, Building, PlusCircle,
  Activity, Download, Megaphone, Eye
} from 'lucide-react';
import { db, auth } from './firebase';
import {
  collection, getDocs, addDoc, serverTimestamp, query, orderBy, where,
  doc, updateDoc, setDoc, getDoc
} from 'firebase/firestore';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail
} from 'firebase/auth';
import type { User } from 'firebase/auth';

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeipfd2MOSAwUms8yX_Gh9eCbODKDzVGLqDhxi7lk0Ni3lBrBOHaVHV6M0UYb5W8X3gw/exec";

interface Groupe {
  id: string; nom: string; codes?: string[]; prefixeBase: string;
  dateCreation: any; profId?: string;
  periodesDebloquees?: number[];
  codesUtilises?: Record<string, { nom: string; email: string; uid: string; date: any }>;
}
interface Ecole {
  id: string; nom: string; prefixe: string;
  codesProfs?: string[];
  codesProfsUtilises?: Record<string, { email: string; uid: string; date: any }>;
  nbGroupes?: number; nbResultats?: number; tauxReussite?: number;
}
interface ProfProfil {
  id: string; uid: string; email: string; codeUtilise: string; ecoleId: string; dateInscription: any;
}

const ADMIN_EMAIL = 'christopher.plante@gmail.com';

const PERIODES_HISTORIQUES = [
  { id: 1, titre: "Des origines à 1608 : L'expérience des Autochtones et le projet de colonie" },
  { id: 2, titre: "1608-1760 : L'évolution de la société coloniale" },
  { id: 3, titre: "1760-1791 : La Conquête et le changement d'empire" },
  { id: 4, titre: "1791-1840 : Les revendications et les luttes nationales" },
  { id: 5, titre: "1840-1896 : La formation du régime fédéral canadien" },
  { id: 6, titre: "1896-1945 : Les nationalismes et l'autonomie du Canada" },
  { id: 7, titre: "1945-1980 : La modernisation du Québec et la Révolution tranquille" },
  { id: 8, titre: "De 1980 à nos jours : Les choix de société dans le Québec contemporain" }
];

function genererCodesProfs(prefixe: string, nombre: number): string[] {
  return Array.from({ length: nombre }, (_, i) => `${prefixe}-PROF-${(i + 1).toString().padStart(2, '0')}`);
}

async function callAppsScript(action: string, payload: any) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) { console.error("Fetch error:", error); throw error; }
}

// --- 1. ACCUEIL ---
function EcranAccueil({ onChoisirRole }: { onChoisirRole: (role: 'eleve' | 'enseignant') => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8 text-center">
        <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-4"><BookOpen className="h-8 w-8" /></div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Corrige.moi</h1>
        <p className="text-sm text-slate-500 mb-8">Es-tu un(e) élève ou un(e) enseignant(e) ?</p>
        <div className="space-y-3">
          <button onClick={() => onChoisirRole('eleve')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
            <UserIcon className="h-4 w-4" /> Je suis un(e) élève
          </button>
          <button onClick={() => onChoisirRole('enseignant')} className="w-full bg-white hover:bg-slate-50 text-slate-700 py-3.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-300">
            <Shield className="h-4 w-4" /> Je suis enseignant(e)
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 2. CONNEXION ÉLÈVE ---
function EcranConnexionEleve({ surRetour }: { surRetour: () => void }) {
  const [mode, setMode] = useState<'connexion' | 'creation'>('connexion');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [nomEleve, setNomEleve] = useState('');
  const [codeEleve, setCodeEleve] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault(); setErreur(null); setEnCours(true);
    try {
      if (mode === 'connexion') { await signInWithEmailAndPassword(auth, email, motDePasse); return; }
      const codeNettoye = codeEleve.trim().toUpperCase();
      const qGroupe = query(collection(db, 'groupes'), where('codes', 'array-contains', codeNettoye));
      const snapGroupe = await getDocs(qGroupe);
      if (snapGroupe.empty) { setErreur("Ce code n'est pas reconnu."); setEnCours(false); return; }
      const groupeDoc = snapGroupe.docs[0];
      const groupeData = groupeDoc.data() as any;
      if (groupeData.codesUtilises && groupeData.codesUtilises[codeNettoye]) { setErreur("Code déjà utilisé."); setEnCours(false); return; }
      const cred = await createUserWithEmailAndPassword(auth, email, motDePasse);
      await setDoc(doc(db, 'eleves', cred.user.uid), { uid: cred.user.uid, nom: nomEleve.trim(), email, codeUtilise: codeNettoye, groupeId: groupeDoc.id, dateInscription: serverTimestamp() });
      await updateDoc(doc(db, 'groupes', groupeDoc.id), { [`codesUtilises.${codeNettoye}`]: { nom: nomEleve.trim(), email, uid: cred.user.uid, date: serverTimestamp() } });
    } catch (err: any) { setErreur("Erreur d'authentification. Vérifie tes infos."); } finally { setEnCours(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm p-8">
        <div className="flex justify-between mb-6"><div className="text-indigo-600 font-bold text-lg flex items-center gap-2"><UserIcon className="h-5 w-5" /> Portail Élève</div><button onClick={surRetour} className="text-xs text-slate-400 underline">Retour</button></div>
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg">
          <button type="button" onClick={() => setMode('connexion')} className={`flex-1 text-sm font-medium py-2 rounded-md ${mode === 'connexion' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Se connecter</button>
          <button type="button" onClick={() => setMode('creation')} className={`flex-1 text-sm font-medium py-2 rounded-md ${mode === 'creation' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Créer mon compte</button>
        </div>
        <form onSubmit={soumettre} className="space-y-4">
          {mode === 'creation' && (
            <>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Code d'accès</label><input type="text" required value={codeEleve} onChange={(e) => setCodeEleve(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono" placeholder="Ex: ANJ-GRP-01" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Prénom et Nom</label><input type="text" required value={nomEleve} onChange={(e) => setNomEleve(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Ex: Jean Tremblay" /></div>
            </>
          )}
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Courriel</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label><input type="password" required minLength={6} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          {erreur && <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">{erreur}</div>}
          <button type="submit" disabled={enCours} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium">{enCours ? '...' : (mode === 'connexion' ? 'Accéder à mes exercices' : 'Activer mon accès')}</button>
        </form>
      </div>
    </div>
  );
}

// --- 3. CONNEXION PROF ---
function EcranConnexionProf({ surRetour }: { surRetour: () => void }) {
  const [mode, setMode] = useState<'connexion' | 'creation'>('connexion');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [codeProf, setCodeProf] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault(); setErreur(null); setEnCours(true);
    try {
      if (mode === 'connexion') { await signInWithEmailAndPassword(auth, email, motDePasse); return; }
      const codeNettoye = codeProf.trim().toUpperCase();
      const qEcole = query(collection(db, 'codes_ecole'), where('codesProfs', 'array-contains', codeNettoye));
      const snapEcole = await getDocs(qEcole);
      if (snapEcole.empty) { setErreur("Code enseignant non reconnu."); setEnCours(false); return; }
      const ecoleDoc = snapEcole.docs[0];
      const ecoleData = ecoleDoc.data() as any;
      if (ecoleData.codesProfsUtilises && ecoleData.codesProfsUtilises[codeNettoye]) { setErreur("Code déjà utilisé."); setEnCours(false); return; }
      const cred = await createUserWithEmailAndPassword(auth, email, motDePasse);
      await setDoc(doc(db, 'profs', cred.user.uid), { uid: cred.user.uid, email, codeUtilise: codeNettoye, ecoleId: ecoleDoc.id, dateInscription: serverTimestamp() });
      await updateDoc(doc(db, 'codes_ecole', ecoleDoc.id), { [`codesProfsUtilises.${codeNettoye}`]: { email, uid: cred.user.uid, date: serverTimestamp() } });
    } catch (err: any) { setErreur("Erreur d'authentification."); } finally { setEnCours(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm p-8">
        <div className="flex justify-between mb-6"><div className="text-indigo-600 font-bold text-lg flex items-center gap-2"><Shield className="h-5 w-5" /> Portail Enseignant</div><button onClick={surRetour} className="text-xs text-slate-400 underline">Retour</button></div>
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg">
          <button type="button" onClick={() => setMode('connexion')} className={`flex-1 text-sm font-medium py-2 rounded-md ${mode === 'connexion' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Se connecter</button>
          <button type="button" onClick={() => setMode('creation')} className={`flex-1 text-sm font-medium py-2 rounded-md ${mode === 'creation' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Activer mon code</button>
        </div>
        <form onSubmit={soumettre} className="space-y-4">
          {mode === 'creation' && (
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Code enseignant</label><input type="text" required value={codeProf} onChange={(e) => setCodeProf(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono" placeholder="Ex: STX-PROF-01" /></div>
          )}
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Courriel</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label><input type="password" required minLength={6} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          {erreur && <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">{erreur}</div>}
          <button type="submit" disabled={enCours} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium">{enCours ? '...' : (mode === 'connexion' ? 'Se connecter' : 'Activer mon compte')}</button>
        </form>
      </div>
    </div>
  );
}

// --- 4. REDIRECTION ÉLÈVE ---
function RedirectionEleve({ user, surDeconnexion }: { user: User; surDeconnexion: () => void }) {
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function preparerRedirection() {
      try {
        const snap = await getDoc(doc(db, 'eleves', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          window.location.href = `https://histoire4.corrige.moi/?nom=${encodeURIComponent(data.nom)}&code=${encodeURIComponent(data.codeUtilise)}`;
        } else { setErreur("Profil introuvable."); }
      } catch (err) { setErreur("Erreur de redirection."); }
    }
    preparerRedirection();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full">
        {erreur ? (
          <><div className="inline-flex p-4 bg-red-50 text-red-600 rounded-xl mb-4"><AlertCircle className="h-8 w-8" /></div><h1 className="text-xl font-bold mb-2">Oups !</h1><p className="text-sm mb-6">{erreur}</p><button onClick={surDeconnexion} className="bg-slate-200 px-6 py-2 rounded-lg text-sm">Déconnexion</button></>
        ) : (
          <><div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-xl mb-4"><Loader2 className="h-8 w-8 animate-spin" /></div><h1 className="text-xl font-bold mb-2">Redirection...</h1></>
        )}
      </div>
    </div>
  );
}

// --- 5. ADMIN DASHBOARD ---
function DashboardAdmin({ surDeconnexion, onImpersonate }: { surDeconnexion: () => void; onImpersonate: (uid: string, email: string) => void }) {
  const [activeTab, setActiveTab] = useState('ecoles');
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [profs, setProfs] = useState<ProfProfil[]>([]);
  const [nomEcole, setNomEcole] = useState('');
  const [prefixe, setPrefixe] = useState('');
  const [nbProfs, setNbProfs] = useState<number>(10);
  const [ecoleDetail, setEcoleDetail] = useState<Ecole | null>(null);

  async function chargerDonnees() {
    const snapEcoles = await getDocs(collection(db, 'codes_ecole'));
    const snapGroupes = await getDocs(collection(db, 'groupes'));
    const snapProfs = await getDocs(collection(db, 'profs'));
    
    setProfs(snapProfs.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    setEcoles(snapEcoles.docs.map(d => {
      const e = { id: d.id, ...(d.data() as any) };
      const grps = snapGroupes.docs.filter(g => (g.data().prefixeBase || '').startsWith(`${e.prefixe}-`));
      return { ...e, nbGroupes: grps.length };
    }));
  }

  useEffect(() => { chargerDonnees(); }, []);

  async function ajouterEcole(e: React.FormEvent) {
    e.preventDefault(); 
    if (!nomEcole.trim() || prefixe.length !== 3) return;
    await addDoc(collection(db, 'codes_ecole'), { nom: nomEcole.trim(), prefixe: prefixe.toUpperCase(), codesProfs: genererCodesProfs(prefixe.toUpperCase(), nbProfs) });
    setNomEcole(''); setPrefixe(''); setNbProfs(10); chargerDonnees();
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200"><h1 className="text-xl font-bold text-indigo-600">Admin</h1></div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('ecoles')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'ecoles' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>Écoles</button>
          <button onClick={() => setActiveTab('profs')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'profs' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>Enseignants</button>
        </nav>
        <button onClick={surDeconnexion} className="m-4 px-4 py-2 text-sm bg-slate-200 rounded-lg">Quitter</button>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {activeTab === 'ecoles' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <h3 className="font-bold mb-4">Nouvelle école</h3>
              <form onSubmit={ajouterEcole} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nom / CSS</label>
                  <input type="text" value={nomEcole} onChange={e => setNomEcole(e.target.value)} placeholder="Nom" className="w-full border p-2 rounded-lg text-sm" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Préfixe (3)</label>
                  <input type="text" maxLength={3} minLength={3} value={prefixe} onChange={e => setPrefixe(e.target.value.toUpperCase())} placeholder="ABC" className="w-full border p-2 rounded-lg font-mono uppercase text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nb Profs</label>
                  <input type="number" min="1" value={nbProfs} onChange={e => setNbProfs(Number(e.target.value))} className="w-full border p-2 rounded-lg text-sm" />
                </div>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium h-[38px]">Générer</button>
              </form>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <table className="w-full text-left text-sm">
                <thead><tr><th className="pb-3">École</th><th className="pb-3">Groupes</th><th className="pb-3 text-right">Codes</th></tr></thead>
                <tbody>
                  {ecoles.map(e => (
                    <tr key={e.id} className="border-t">
                      <td className="py-3">{e.nom} ({e.prefixe})</td><td className="py-3">{e.nbGroupes}</td>
                      <td className="py-3 text-right cursor-pointer text-indigo-600" onClick={() => setEcoleDetail(e)}>
                        {Object.keys(e.codesProfsUtilises || {}).length}/{e.codesProfs?.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'profs' && (
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <table className="w-full text-left text-sm">
              <thead><tr><th className="pb-3">Courriel</th><th className="pb-3">Code</th><th className="pb-3 text-right">Action</th></tr></thead>
              <tbody>
                {profs.map(p => (
                  <tr key={p.id} className="border-t"><td className="py-3">{p.email}</td><td className="py-3">{p.codeUtilise}</td>
                  <td className="py-3 text-right"><button onClick={() => onImpersonate(p.uid, p.email)} className="text-indigo-600">Voir comme</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {ecoleDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex justify-between mb-4"><h2 className="font-bold">{ecoleDetail.nom}</h2><button onClick={() => setEcoleDetail(null)}>X</button></div>
            <div className="max-h-64 overflow-auto space-y-2">
              {(ecoleDetail.codesProfs || []).map(c => (
                <div key={c} className="p-2 border rounded flex justify-between">
                  <span>{c}</span>
                  {ecoleDetail.codesProfsUtilises?.[c] ? <span className="text-green-600">{ecoleDetail.codesProfsUtilises[c].email}</span> : <span className="text-gray-400">Libre</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 6. TABLEAU DE BORD PROFESSEUR ---
function DashboardProf({ user, surDeconnexion, modeImpersonation = false }: { user: User; surDeconnexion: () => void, modeImpersonation?: boolean }) {
  const [activeTab, setActiveTab] = useState<'groupes' | 'statistiques'>('groupes');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [resultats, setResultats] = useState<any[]>([]);
  
  // États pour l'école
  const [profEcolePrefixe, setProfEcolePrefixe] = useState('');
  const [isPrefixeEditable, setIsPrefixeEditable] = useState(false);
  
  const [nouveauGroupeNom, setNouveauGroupeNom] = useState('');
  const [prefixeGroupe, setPrefixeGroupe] = useState('');
  const [nbEleves, setNbEleves] = useState<number>(30);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [groupeDetail, setGroupeDetail] = useState<Groupe | null>(null);
  
  const [activeModalTab, setActiveModalTab] = useState<'periodes' | 'codes'>('periodes');
  const [groupeFiltre, setGroupeFiltre] = useState<string>('Tous');
  const [eleveBilanDetail, setEleveBilanDetail] = useState<{ nom: string, groupe: string, resultats: any[], bilan: string, loading: boolean } | null>(null);

  async function chargerDonnees() {
    // 1. Charger les écoles
    const snapEcoles = await getDocs(collection(db, 'codes_ecole'));
    const ecolesData = snapEcoles.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    // 2. Charger les groupes d'abord pour le fallback
    const snapGroupes = await getDocs(query(collection(db, 'groupes'), where('profId', '==', user.uid)));
    const listeGroupes = snapGroupes.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    listeGroupes.sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0));
    const groupesMigres = listeGroupes.map(g => ({ ...g, periodesDebloquees: g.periodesDebloquees || [1,2,3,4,5,6,7,8] }));
    setGroupes(groupesMigres);

    // 3. Trouver l'école du professeur
    let detectedPrefix = '';
    try {
      const profSnap = await getDoc(doc(db, 'profs', user.uid));
      if (profSnap.exists()) {
        const pData = profSnap.data();
        const monEcole = ecolesData.find((e: any) => e.id === pData.ecoleId);
        if (monEcole && monEcole.prefixe) {
          detectedPrefix = monEcole.prefixe;
        } else if (pData.codeUtilise) {
          detectedPrefix = pData.codeUtilise.split('-')[0];
        }
      }
    } catch(e) { console.error("Erreur détection école", e); }

    // Fallback: extraction depuis les anciens groupes
    if (!detectedPrefix && listeGroupes.length > 0) {
      const g = listeGroupes.find(gr => gr.prefixeBase);
      if (g) detectedPrefix = g.prefixeBase.split('-')[0];
    }

    if (detectedPrefix) {
      setProfEcolePrefixe(detectedPrefix);
      setIsPrefixeEditable(false);
    } else {
      setProfEcolePrefixe('');
      setIsPrefixeEditable(true); // Ouvre le champ pour les très vieux comptes
    }

    // 4. Charger les résultats
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
      const base = `${profEcolePrefixe}-${g}`;
      const listeCodes = Array.from({length: nbEleves}, (_, i) => `${base}-${(i+1).toString().padStart(2, '0')}`);
      await addDoc(collection(db, 'groupes'), { 
        nom: nouveauGroupeNom.trim(), prefixeBase: base, codes: listeCodes, profId: user.uid, 
        dateCreation: serverTimestamp(), periodesDebloquees: [1,2,3,4,5,6,7,8]
      });
      setNouveauGroupeNom(''); setPrefixeGroupe(''); setShowCodeModal(false); chargerDonnees();
    } catch(err) {} finally { setCreationEnCours(false); }
  }

  async function togglePeriode(groupeId: string, periodeId: number, currentList: number[]) {
    let newList = [...currentList];
    if (newList.includes(periodeId)) {
      if (newList.length === 1) return;
      newList = newList.filter(id => id !== periodeId);
    } else { newList.push(periodeId); }
    newList.sort((a, b) => a - b);
    try {
      await updateDoc(doc(db, 'groupes', groupeId), { periodesDebloquees: newList });
      setGroupes(prev => prev.map(g => g.id === groupeId ? { ...g, periodesDebloquees: newList } : g));
      if (groupeDetail && groupeDetail.id === groupeId) setGroupeDetail({ ...groupeDetail, periodesDebloquees: newList });
    } catch (e) {}
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
        stats.push({ nom: eleve.nom, groupe: g.nom, nbTotal, taux, couleur, resultatsEleve: resEleve });
      });
    });
    return stats.sort((a, b) => a.groupe.localeCompare(b.groupe) || a.nom.localeCompare(b.nom));
  };

  async function genererBilanIA(statEleve: any) {
    setEleveBilanDetail({ nom: statEleve.nom, groupe: statEleve.groupe, resultats: statEleve.resultatsEleve, bilan: "", loading: true });
    if (!statEleve.resultatsEleve || statEleve.resultatsEleve.length === 0) {
      setEleveBilanDetail(prev => prev ? {...prev, loading: false, bilan: "Cet élève n'a pas encore fait d'exercices."} : null);
      return;
    }
    const infos = statEleve.resultatsEleve.map((r: any) => `Opération: ${r.operation}, Note: ${r.note}, Verdict: ${r.resultat}`).join(" | ");
    const prompt = `Tu es un assistant pédagogique pour un enseignant d'histoire du Québec et du Canada. Voici l'historique récent de l'élève ${statEleve.nom} : ${infos}. Fais un bilan direct (3-4 phrases maximum) de ses forces et indique 1 ou 2 points précis à travailler. Sois encourageant. Pas de balises markdown.`;
    
    try {
      const resp = await callAppsScript('generer', { prompt });
      let texte = resp.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      setEleveBilanDetail(prev => prev ? {...prev, loading: false, bilan: texte} : null);
    } catch(e) {
      setEleveBilanDetail(prev => prev ? {...prev, loading: false, bilan: "Erreur lors de la génération du bilan. Veuillez réessayer."} : null);
    }
  }

  const peutCreerGroupe = !creationEnCours && nouveauGroupeNom.trim() !== '' && prefixeGroupe.trim() !== '' && profEcolePrefixe.trim() !== '';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {modeImpersonation && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white px-4 py-2 text-sm font-bold flex justify-between z-50">
          <span>⚠️ IMPERSONATION: {user.email}</span>
          <button onClick={surDeconnexion} className="underline">Retour à l'Admin</button>
        </div>
      )}
      
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 ${modeImpersonation ? 'mt-10' : ''}`}>
        <div className="p-6 border-b border-slate-200"><div className="text-indigo-600 font-bold text-xl"><BookOpen className="h-6 w-6 inline mr-2"/> Corrige.moi</div></div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('groupes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'groupes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Users className="h-5 w-5" /> Mes Groupes ({groupes.length}/6)</button>
          <button onClick={() => setActiveTab('statistiques')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'statistiques' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Activity className="h-5 w-5" /> Statistiques élèves</button>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="px-4 pb-2 text-xs text-slate-400 truncate">{user.email}</div>
          <button onClick={surDeconnexion} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"><LogOut className="h-5 w-5" /> Déconnexion</button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col overflow-hidden ${modeImpersonation ? 'mt-10' : ''}`}>
        {activeTab === 'groupes' && (
          <>
            <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
              <h1 className="text-2xl font-bold text-slate-900">Mes Groupes</h1>
              <button onClick={() => setShowCodeModal(true)} disabled={limiteGroupesAtteinte} className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors">+ Générer des codes</button>
            </header>
            <div className="flex-1 overflow-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupes.map(g => {
                  const nbUtilises = Object.keys(g.codesUtilises || {}).length;
                  const totalCodes = g.codes?.length || 0;
                  return (
                    <button key={g.id} onClick={() => { setGroupeDetail(g); setActiveModalTab('periodes'); }} className="text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
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
            <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-900">Statistiques globales</h1>
              <select value={groupeFiltre} onChange={(e) => setGroupeFiltre(e.target.value)} className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50">
                <option value="Tous">Tous les groupes</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </header>
            <div className="flex-1 overflow-auto p-8">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr><th className="px-6 py-4 border-b">Élève</th><th className="px-6 py-4 border-b">Groupe</th><th className="px-6 py-4 border-b text-center">Exercices</th><th className="px-6 py-4 border-b text-center">Réussite</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {genererStatistiques().map((stat, i) => (
                      <tr key={i} onClick={() => genererBilanIA(stat)} className="hover:bg-indigo-50 cursor-pointer transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${stat.couleur} shadow-sm`}></div>
                          {stat.nom}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{stat.groupe}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{stat.nbTotal}</td>
                        <td className="px-6 py-4 text-center">
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
              <p className="text-sm text-slate-500 mt-4 italic">Astuce : Cliquez sur un élève pour que Corrige.moi dresse un bilan pédagogique de ses forces et faiblesses.</p>
            </div>
          </>
        )}
      </main>

      {/* MODAL CODES */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Générer des codes élèves</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'affichage</label>
                <input type="text" placeholder="Ex: Histoire 401" value={nouveauGroupeNom} onChange={e => setNouveauGroupeNom(e.target.value)} className="w-full border p-2 rounded-lg" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">École</label>
                  {isPrefixeEditable ? (
                    <input type="text" maxLength={3} placeholder="STX" value={profEcolePrefixe} onChange={e => setProfEcolePrefixe(e.target.value.toUpperCase())} className="w-full border border-amber-300 p-2 rounded-lg font-mono uppercase h-[42px] focus:ring-2 focus:ring-amber-500 outline-none" />
                  ) : (
                    <div className="w-full border p-2 rounded-lg bg-slate-100 text-slate-500 font-mono flex items-center h-[42px]">
                      {profEcolePrefixe || 'Chargement...'}
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

      {/* MODAL DÉTAIL GROUPE (ONGLETS PÉRIODES & CODES) */}
      {groupeDetail && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex justify-between shrink-0 bg-white">
              <div><h2 className="text-xl font-bold text-slate-900">{groupeDetail.nom}</h2><p className="text-sm font-mono text-indigo-600">{groupeDetail.prefixeBase}</p></div>
              <button onClick={() => setGroupeDetail(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* ONGLETS */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0">
              <button onClick={() => setActiveModalTab('periodes')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeModalTab === 'periodes' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Périodes déverrouillées</button>
              <button onClick={() => setActiveModalTab('codes')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeModalTab === 'codes' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Codes élèves</button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-white">
              {activeModalTab === 'periodes' && (
                <div>
                  <label className="block text-sm text-slate-500 mb-4">Cochez les périodes auxquelles vos élèves auront accès pour s'exercer.</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PERIODES_HISTORIQUES.map(p => {
                      const estCochee = (groupeDetail.periodesDebloquees || []).includes(p.id);
                      return (
                        <label key={p.id} className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${estCochee ? 'bg-indigo-50/50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                          <input type="checkbox" checked={estCochee} onChange={() => togglePeriode(groupeDetail.id, p.id, groupeDetail.periodesDebloquees || [])} className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                          <span className={`text-sm font-medium leading-snug ${estCochee ? 'text-indigo-900' : 'text-slate-600'}`}>Période {p.id} : {p.titre.split(' : ')[1] || p.titre}</span>
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
                            <button onClick={() => sendPasswordResetEmail(auth, utilise.email).then(()=>alert("Courriel de réinitialisation envoyé !"))} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg shadow-sm">Mot de passe oublié ?</button>
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
                <button onClick={() => setEleveBilanDetail(null)} className="p-2 bg-white hover:bg-slate-100 text-slate-500 rounded-lg shadow-sm border border-slate-200"><X className="h-5 w-5"/></button>
             </div>
             <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl"><Activity className="h-5 w-5" /></div>
                  <h3 className="text-lg font-bold text-slate-800">Diagnostic de Corrige.moi</h3>
                </div>
                {eleveBilanDetail.loading ? (
                   <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                     <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-500"/>
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

// --- 7. RACINE ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'admin' | 'prof' | 'eleve' | null>(null);
  const [verificationEnCours, setVerificationEnCours] = useState(true);
  const [role, setRole] = useState<'eleve' | 'enseignant' | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'logout') { signOut(auth).then(() => { window.location.replace('/'); }); }
  }, []);

  useEffect(() => {
    const timerFade = setTimeout(() => setIsFading(true), 2000);
    const timerRemove = setTimeout(() => setShowSplash(false), 3000);
    return () => { clearTimeout(timerFade); clearTimeout(timerRemove); };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setUserType(null); setVerificationEnCours(false); return; }
      setUser(u);
      if (u.email === ADMIN_EMAIL) setUserType('admin');
      else {
        try { const profSnap = await getDoc(doc(db, 'profs', u.uid)); setUserType(profSnap.exists() ? 'prof' : 'eleve'); } 
        catch (e) { setUserType('eleve'); }
      }
      setVerificationEnCours(false);
    });
    return () => unsubscribe();
  }, []);

  if (verificationEnCours) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>;

  return (
    <>
      {showSplash && <div className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-1000 pointer-events-none ${isFading ? 'opacity-0' : 'opacity-100'}`}><img src="/corrige.moi.jpg" alt="Logo" className="w-64 md:w-96 object-contain" /></div>}
      {user && userType === 'admin' ? <DashboardAdmin surDeconnexion={() => signOut(auth)} onImpersonate={()=>{}} /> : null}
      {user && userType === 'prof' ? <DashboardProf user={user} surDeconnexion={() => { signOut(auth); setRole(null); }} /> : null}
      {user && userType === 'eleve' ? <RedirectionEleve user={user} surDeconnexion={() => { signOut(auth); setRole(null); }} /> : null}
      {!user && role === 'eleve' ? <EcranConnexionEleve surRetour={() => setRole(null)} /> : null}
      {!user && role === 'enseignant' ? <EcranConnexionProf surRetour={() => setRole(null)} /> : null}
      {!user && !role ? <EcranAccueil onChoisirRole={setRole} /> : null}
    </>
  );
}