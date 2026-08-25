import React, { useState, useEffect } from 'react';
import {
  BookOpen, Users, Settings, Key, Search, FileText,
  CheckCircle, AlertCircle, LogOut, Shield, X, RefreshCw, Loader2,
  Lock, Mail, ArrowRight, User as UserIcon, Building, PlusCircle,
  Activity, Download, Megaphone, Eye, ChevronRight, Menu
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

// --- COMPOSANT PIED DE PAGE (Mentions légales) ---
function FooterGlobale() {
  const [showAPropos, setShowAPropos] = useState(false);
  return (
    <footer className="w-full text-center py-6 px-6 text-[11px] sm:text-xs text-slate-400 mt-auto shrink-0 border-t border-slate-200 bg-slate-50">
      <p className="max-w-3xl mx-auto mb-2">Cette application est conçue uniquement pour la pratique des compétences, notamment les opérations intellectuelles. Elle ne sert pas de remplacement à un enseignant d'histoire.</p>
      <button onClick={() => setShowAPropos(true)} className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors">À propos du projet</button>
      
      {showAPropos && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm text-left">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-500"/> À propos de Corrige.moi</h2>
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Ce projet est une initiative strictement personnelle. Il n'est affilié d'aucune façon au gouvernement du Québec, ni au Ministère de l'Éducation.</p>
              <p>Notre mission est d'utiliser la force des grands modèles de langage au service de la pratique des compétences historiques et de fournir un soutien pédagogique interactif.</p>
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setShowAPropos(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

// --- 1. ACCUEIL ---
function EcranAccueil({ onChoisirRole }: { onChoisirRole: (role: 'eleve' | 'enseignant') => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <div className="flex-1 flex items-center justify-center p-4">
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
      <FooterGlobale />
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
  const [acceptePolitique, setAcceptePolitique] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault(); setErreur(null); setEnCours(true);
    try {
      if (mode === 'connexion') { await signInWithEmailAndPassword(auth, email, motDePasse); return; }
      if (!acceptePolitique) { setErreur("Vous devez accepter la politique de confidentialité."); setEnCours(false); return; }
      
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex items-center justify-center p-4">
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
            
            {mode === 'creation' && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required checked={acceptePolitique} onChange={(e) => setAcceptePolitique(e.target.checked)} className="mt-1 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                  <span className="text-xs text-slate-600 leading-snug">
                    En créant ce compte, vous consentez à ce que vos informations (nom, courriel, réponses aux exercices) soient enregistrées pour permettre la correction et le suivi pédagogique exclusif par votre enseignant. Aucune donnée personnelle n'est utilisée à des fins commerciales ni partagée à des tiers.
                  </span>
                </label>
              </div>
            )}

            {erreur && <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">{erreur}</div>}
            <button type="submit" disabled={enCours || (mode === 'creation' && !acceptePolitique)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">{enCours ? '...' : (mode === 'connexion' ? 'Accéder à mes exercices' : 'Activer mon accès')}</button>
          </form>
        </div>
      </div>
      <FooterGlobale />
    </div>
  );
}

// --- 3. CONNEXION PROF ---
function EcranConnexionProf({ surRetour }: { surRetour: () => void }) {
  const [mode, setMode] = useState<'connexion' | 'creation'>('connexion');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [codeProf, setCodeProf] = useState('');
  const [acceptePolitique, setAcceptePolitique] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault(); setErreur(null); setEnCours(true);
    try {
      if (mode === 'connexion') { await signInWithEmailAndPassword(auth, email, motDePasse); return; }
      if (!acceptePolitique) { setErreur("Vous devez accepter la politique de confidentialité."); setEnCours(false); return; }

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex items-center justify-center p-4">
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
            
            {mode === 'creation' && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required checked={acceptePolitique} onChange={(e) => setAcceptePolitique(e.target.checked)} className="mt-1 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                  <span className="text-xs text-slate-600 leading-snug">
                    En créant ce compte, vous acceptez la création d'un espace d'enseignement et le traitement des données nécessaires au suivi pédagogique de vos groupes. Aucune donnée n'est partagée à des tiers.
                  </span>
                </label>
              </div>
            )}

            {erreur && <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">{erreur}</div>}
            <button type="submit" disabled={enCours || (mode === 'creation' && !acceptePolitique)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">{enCours ? '...' : (mode === 'connexion' ? 'Se connecter' : 'Activer mon compte')}</button>
          </form>
        </div>
      </div>
      <FooterGlobale />
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

// --- 5. ADMIN DASHBOARD (AVEC DRILL-DOWN & RESPONSIVE) ---
function DashboardAdmin({ surDeconnexion, onImpersonate }: { surDeconnexion: () => void; onImpersonate: (uid: string, email: string) => void }) {
  const [vueCourante, setVueCourante] = useState<'ecoles' | 'profs' | 'groupes' | 'eleves' | 'resultats' | 'stats'>('ecoles');
  const [menuOuvert, setMenuOuvert] = useState(false);
  
  const [ecoleActive, setEcoleActive] = useState<Ecole | null>(null);
  const [profActif, setProfActif] = useState<ProfProfil | null>(null);
  const [groupeActif, setGroupeActif] = useState<Groupe | null>(null);
  const [eleveActif, setEleveActif] = useState<{nom: string, code: string, email?: string} | null>(null);

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
  const navVersResultats = (eleve: {nom: string, code: string, email?: string}) => { setEleveActif(eleve); setVueCourante('resultats'); };

  const profsFiltres = profs.filter(p => p.ecoleId === ecoleActive?.id);
  const groupesFiltres = groupesAdmin.filter(g => g.profId === profActif?.uid);
  const resultatsEleve = resultatsGlobaux.filter(r => r.codeUtilise === eleveActif?.code && r.eleve === eleveActif?.nom).sort((a,b) => (b.horodatage?.seconds || 0) - (a.horodatage?.seconds || 0));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-800 z-20">
        <div className="p-4 md:p-6 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="text-indigo-400"/> Espace Admin</h1>
          <button className="md:hidden p-2 rounded hover:bg-slate-800" onClick={() => setMenuOuvert(!menuOuvert)}><Menu className="h-6 w-6" /></button>
        </div>
        <nav className={`flex-1 p-4 space-y-2 ${menuOuvert ? 'block' : 'hidden md:block'} overflow-y-auto`}>
          <button onClick={navVersEcoles} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${vueCourante !== 'stats' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Building className="h-5 w-5"/> Établissements</button>
          <button onClick={navVersStats} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${vueCourante === 'stats' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Activity className="h-5 w-5"/> Global (Stats)</button>
          <div className="pt-6">
            <button onClick={surDeconnexion} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><LogOut className="h-5 w-5"/> Déconnexion</button>
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
                <button onClick={navVersEcoles} className="hover:text-indigo-600 flex items-center gap-1"><Building className="h-4 w-4 hidden md:inline-block"/> Écoles</button>
                {ecoleActive && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0"/><button onClick={() => navVersProfs(ecoleActive)} className="hover:text-indigo-600 truncate max-w-[120px] md:max-w-[150px]">{ecoleActive.nom}</button></>}
                {profActif && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0"/><button onClick={() => navVersGroupes(profActif)} className="hover:text-indigo-600 truncate max-w-[120px] md:max-w-[200px]">{profActif.email}</button></>}
                {groupeActif && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0"/><button onClick={() => navVersEleves(groupeActif)} className="hover:text-indigo-600 truncate max-w-[120px] md:max-w-[150px]">{groupeActif.nom}</button></>}
                {eleveActif && <><ChevronRight className="h-4 w-4 text-slate-300 shrink-0"/><span className="text-slate-900 font-bold truncate max-w-[120px] md:max-w-[150px]">{eleveActif.nom}</span></>}
              </>
            )}
          </div>
          {vueCourante === 'ecoles' && (
            <button onClick={() => setShowCreationModal(true)} className="flex items-center gap-1 md:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium shadow-sm shrink-0"><PlusCircle className="h-4 w-4"/> <span className="hidden md:inline">Nouvelle école</span></button>
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
                           <button onClick={() => navVersProfs(e)} className="bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 md:px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">Profs <ArrowRight className="h-4 w-4 hidden md:block"/></button>
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
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Activity className="h-6 w-6 text-indigo-500"/> Toutes les statistiques</h2>
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
                    {resultatsGlobaux.sort((a,b) => (b.horodatage?.seconds || 0) - (a.horodatage?.seconds || 0)).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">{r.horodatage?.seconds ? new Date(r.horodatage.seconds * 1000).toLocaleString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : '-'}</td>
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
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Users className="h-6 w-6 text-indigo-500"/> Professeurs ({ecoleActive.nom})</h2>
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
                               <button onClick={() => onImpersonate(p.uid, p.email)} className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 flex items-center gap-1"><Eye className="h-3 w-3"/> Voir comme</button>
                               <button onClick={() => navVersGroupes(p)} className="bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 md:px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">Groupes ({nbGroupesDuProf}) <ArrowRight className="h-4 w-4 hidden md:block"/></button>
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
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><BookOpen className="h-6 w-6 text-indigo-500"/> Groupes de {profActif.email}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupesFiltres.map(g => {
                  const nbUtilises = Object.keys(g.codesUtilises || {}).length;
                  const totalCodes = g.codes?.length || 0;
                  return (
                    <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full">
                      <h3 className="font-bold text-lg text-slate-900 mb-1">{g.nom}</h3>
                      <div className="text-sm font-mono text-slate-500 mb-4">{g.prefixeBase}</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${totalCodes > 0 ? (nbUtilises / totalCodes) * 100 : 0}%` }}></div></div>
                      <div className="text-xs text-slate-500 mb-6">{nbUtilises} élèves inscrits sur {totalCodes} codes</div>
                      <button onClick={() => navVersEleves(g)} className="mt-auto w-full bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">Dossiers des élèves <ArrowRight className="h-4 w-4"/></button>
                    </div>
                  );
                })}
                {groupesFiltres.length === 0 && <div className="col-span-full text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">Ce professeur n'a pas encore créé de groupe.</div>}
              </div>
            </div>
          )}

          {vueCourante === 'eleves' && groupeActif && (
            <div>
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Users className="h-6 w-6 text-indigo-500"/> Élèves inscrits ({groupeActif.nom})</h2>
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
                              <button onClick={() => navVersResultats({...eleveData, code})} className="bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 md:px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex ml-auto items-center gap-2">Dossier <FileText className="h-4 w-4 hidden md:block"/></button>
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
              <h2 className="text-xl font-bold mb-2 text-slate-800 flex items-center gap-2"><FileText className="h-6 w-6 text-indigo-500"/> Dossier complet de {eleveActif.nom}</h2>
              <p className="text-slate-500 mb-6 font-mono text-sm">Code : {eleveActif.code}</p>
              
              <div className="space-y-4">
                {resultatsEleve.map((r, i) => {
                  const isReussi = String(r.resultat).toLowerCase().includes('réussi') || r.note === '2/2' || r.note === '1/1';
                  const dateFormatee = r.horodatage?.seconds ? new Date(r.horodatage.seconds * 1000).toLocaleString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Date inconnue';
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

// --- 6. TABLEAU DE BORD PROFESSEUR ---
function DashboardProf({ user, surDeconnexion, modeImpersonation = false }: { user: User; surDeconnexion: () => void, modeImpersonation?: boolean }) {
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
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [groupeDetail, setGroupeDetail] = useState<Groupe | null>(null);
  
  const [activeModalTab, setActiveModalTab] = useState<'periodes' | 'codes'>('periodes');
  const [groupeFiltre, setGroupeFiltre] = useState<string>('Tous');
  const [eleveBilanDetail, setEleveBilanDetail] = useState<{ nom: string, groupe: string, resultats: any[], bilan: string, loading: boolean } | null>(null);

  async function chargerDonnees() {
    const snapEcoles = await getDocs(collection(db, 'codes_ecole'));
    const ecolesData = snapEcoles.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const snapGroupes = await getDocs(query(collection(db, 'groupes'), where('profId', '==', user.uid)));
    const listeGroupes = snapGroupes.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    listeGroupes.sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0));
    const groupesMigres = listeGroupes.map(g => ({ ...g, periodesDebloquees: g.periodesDebloquees || [1,2,3,4,5,6,7,8] }));
    setGroupes(groupesMigres);

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
    } catch(e) { console.error("Erreur détection", e); }

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

  async function genererBilan(statEleve: any) {
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
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {modeImpersonation && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white px-4 py-2 text-sm font-bold flex justify-between z-50 shadow-md">
          <span className="flex items-center gap-2"><Eye className="h-4 w-4"/> Mode Impersonation actif : Compte de {user.email}</span>
          <button onClick={surDeconnexion} className="underline hover:text-red-200">Quitter et retourner à l'Admin</button>
        </div>
      )}
      
      <aside className={`w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 z-20 ${modeImpersonation ? 'md:mt-10' : ''}`}>
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-200">
          <div className="text-indigo-600 font-bold text-xl flex items-center gap-2"><BookOpen className="h-6 w-6"/> Corrige.moi</div>
          <button className="md:hidden p-2 rounded hover:bg-slate-100" onClick={() => setMenuOuvert(!menuOuvert)}><Menu className="h-6 w-6" /></button>
        </div>
        <nav className={`flex-1 p-4 space-y-2 ${menuOuvert ? 'block' : 'hidden md:block'} overflow-y-auto`}>
          <button onClick={() => {setActiveTab('groupes'); setMenuOuvert(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'groupes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Users className="h-5 w-5" /> Mes Groupes ({groupes.length}/6)</button>
          <button onClick={() => {setActiveTab('statistiques'); setMenuOuvert(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'statistiques' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Activity className="h-5 w-5" /> Statistiques élèves</button>
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
              <div><h2 className="text-xl font-bold text-slate-900">{groupeDetail.nom}</h2><p className="text-sm font-mono text-indigo-600">{groupeDetail.prefixeBase}</p></div>
              <button onClick={() => setGroupeDetail(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 px-4 md:px-6 pt-2 shrink-0 overflow-x-auto hide-scrollbar">
              <button onClick={() => setActiveModalTab('periodes')} className={`px-4 md:px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeModalTab === 'periodes' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Périodes déverrouillées</button>
              <button onClick={() => setActiveModalTab('codes')} className={`px-4 md:px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeModalTab === 'codes' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Codes élèves</button>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 bg-white">
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
                  <h3 className="text-lg font-bold text-slate-800">Diagnostic du modèle de langage</h3>
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
  
  const [impersonatedProf, setImpersonatedProf] = useState<{uid: string, email: string} | null>(null);

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
      
      {user && userType === 'admin' ? (
         impersonatedProf ? (
           <DashboardProf user={{ uid: impersonatedProf.uid, email: impersonatedProf.email } as User} surDeconnexion={() => setImpersonatedProf(null)} modeImpersonation={true} />
         ) : (
           <DashboardAdmin surDeconnexion={() => signOut(auth)} onImpersonate={(uid, email) => setImpersonatedProf({uid, email})} />
         )
      ) : null}
      
      {user && userType === 'prof' ? <DashboardProf user={user} surDeconnexion={() => { signOut(auth); setRole(null); }} /> : null}
      {user && userType === 'eleve' ? <RedirectionEleve user={user} surDeconnexion={() => { signOut(auth); setRole(null); }} /> : null}
      {!user && role === 'eleve' ? <EcranConnexionEleve surRetour={() => setRole(null)} /> : null}
      {!user && role === 'enseignant' ? <EcranConnexionProf surRetour={() => setRole(null)} /> : null}
      {!user && !role ? <EcranAccueil onChoisirRole={setRole} /> : null}
    </>
  );
}