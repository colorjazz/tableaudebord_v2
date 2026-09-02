import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { db, auth } from './firebase';
import { EcranAccueil } from './components/EcranAccueil';
import { EcranConnexionEleve } from './components/EcranConnexionEleve';
import { EcranConnexionProf } from './components/EcranConnexionProf';
import { RedirectionEleve } from './components/RedirectionEleve';
import { DashboardAdmin } from './pages/DashboardAdmin';
import { DashboardProf } from './pages/DashboardProf';

const ADMIN_EMAIL = 'christopher.plante@gmail.com';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'admin' | 'prof' | 'eleve' | null>(null);
  const [verificationEnCours, setVerificationEnCours] = useState(true);
  const [role, setRole] = useState<'eleve' | 'enseignant' | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);

  const [impersonatedProf, setImpersonatedProf] = useState<{ uid: string, email: string } | null>(null);

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
          <DashboardAdmin surDeconnexion={() => signOut(auth)} onImpersonate={(uid, email) => setImpersonatedProf({ uid, email })} />
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
