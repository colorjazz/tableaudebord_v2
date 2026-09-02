// Palette de couleurs disponibles pour une matière. Les classes Tailwind doivent
// apparaître ici en toutes lettres (pas de `bg-${couleur}-600` ailleurs dans le
// code) car Tailwind ne détecte que les chaînes littérales lors du build.
//
// Pour ajouter une couleur : dupliquer un bloc, changer le préfixe partout,
// puis référencer la nouvelle clé dans src/config/matieres.ts.

export const PALETTES_COULEUR = {
  indigo: {
    texte: 'text-indigo-600',
    texteFonce: 'text-indigo-700',
    bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-700',
    bgClair: 'bg-indigo-50',
    bordure: 'border-indigo-300',
    bordureVive: 'border-indigo-500',
    point: 'bg-indigo-500',
  },
  emerald: {
    texte: 'text-emerald-600',
    texteFonce: 'text-emerald-700',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    bgClair: 'bg-emerald-50',
    bordure: 'border-emerald-300',
    bordureVive: 'border-emerald-500',
    point: 'bg-emerald-500',
  },
  sky: {
    texte: 'text-sky-600',
    texteFonce: 'text-sky-700',
    bg: 'bg-sky-600',
    bgHover: 'hover:bg-sky-700',
    bgClair: 'bg-sky-50',
    bordure: 'border-sky-300',
    bordureVive: 'border-sky-500',
    point: 'bg-sky-500',
  },
  amber: {
    texte: 'text-amber-600',
    texteFonce: 'text-amber-700',
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-700',
    bgClair: 'bg-amber-50',
    bordure: 'border-amber-300',
    bordureVive: 'border-amber-500',
    point: 'bg-amber-500',
  },
  rose: {
    texte: 'text-rose-600',
    texteFonce: 'text-rose-700',
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-700',
    bgClair: 'bg-rose-50',
    bordure: 'border-rose-300',
    bordureVive: 'border-rose-500',
    point: 'bg-rose-500',
  },
  violet: {
    texte: 'text-violet-600',
    texteFonce: 'text-violet-700',
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-700',
    bgClair: 'bg-violet-50',
    bordure: 'border-violet-300',
    bordureVive: 'border-violet-500',
    point: 'bg-violet-500',
  },
  teal: {
    texte: 'text-teal-600',
    texteFonce: 'text-teal-700',
    bg: 'bg-teal-600',
    bgHover: 'hover:bg-teal-700',
    bgClair: 'bg-teal-50',
    bordure: 'border-teal-300',
    bordureVive: 'border-teal-500',
    point: 'bg-teal-500',
  },
} as const;

export type CouleurMatiere = keyof typeof PALETTES_COULEUR;
