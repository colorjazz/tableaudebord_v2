import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import {
  collection, getDocs, query, where, doc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import { FooterGlobale } from './FooterGlobale';

export function EcranConnexionEleve({ surRetour }: { surRetour: () => void }) {
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
