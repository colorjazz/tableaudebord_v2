import { useState } from 'react';
import { BookOpen } from 'lucide-react';

export function FooterGlobale() {
  const [showAPropos, setShowAPropos] = useState(false);
  return (
    <footer className="w-full text-center py-6 px-6 text-[11px] sm:text-xs text-slate-400 mt-auto shrink-0 border-t border-slate-200 bg-slate-50">
      <p className="max-w-3xl mx-auto mb-2">Cette application est conçue uniquement pour la pratique des compétences scolaires. Elle ne sert pas de remplacement à un enseignant.</p>
      <button onClick={() => setShowAPropos(true)} className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors">À propos du projet</button>

      {showAPropos && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm text-left">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-500"/> À propos de Corrige.moi</h2>
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Ce projet est une initiative strictement personnelle. Il n'est affilié d'aucune façon au gouvernement du Québec, ni au Ministère de l'Éducation.</p>
              <p>Notre mission est d'utiliser la force des grands modèles de langage au service de la pratique des compétences scolaires et de fournir un soutien pédagogique interactif, matière par matière.</p>
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
