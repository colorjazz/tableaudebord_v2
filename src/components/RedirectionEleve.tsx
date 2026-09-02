import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { getMatiere } from '../config/matieres';

// Redirige l'élève vers l'app externe de la matière de son groupe. Les élèves
// inscrits avant l'ajout des matières n'ont pas de `matiereId` sur leur
// groupe : getMatiere() retombe alors sur la matière par défaut (histoire),
// ce qui reproduit exactement le comportement d'origine et garde leurs codes
// d'accès valides.
export function RedirectionEleve({ user, surDeconnexion }: { user: User; surDeconnexion: () => void }) {
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function preparerRedirection() {
      try {
        const snap = await getDoc(doc(db, 'eleves', user.uid));
        if (!snap.exists()) { setErreur("Profil introuvable."); return; }
        const data = snap.data();

        let matiereId: string | undefined;
        if (data.groupeId) {
          const groupeSnap = await getDoc(doc(db, 'groupes', data.groupeId));
          if (groupeSnap.exists()) matiereId = (groupeSnap.data() as any).matiereId;
        }

        const matiere = getMatiere(matiereId);
        window.location.href = matiere.urlEleve({ nom: data.nom, code: data.codeUtilise });
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
