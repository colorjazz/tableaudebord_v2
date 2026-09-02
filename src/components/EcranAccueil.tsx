import { BookOpen, Shield, User as UserIcon } from 'lucide-react';
import { FooterGlobale } from './FooterGlobale';

export function EcranAccueil({ onChoisirRole }: { onChoisirRole: (role: 'eleve' | 'enseignant') => void }) {
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
