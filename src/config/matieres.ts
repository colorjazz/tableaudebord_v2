// ---------------------------------------------------------------------------
// REGISTRE DES MATIÈRES DU PORTAIL
// ---------------------------------------------------------------------------
// C'est le SEUL fichier à modifier pour ajouter, retirer ou modifier une
// matière. Chaque enseignant choisit une matière au moment de créer un
// groupe ; les élèves de ce groupe sont ensuite redirigés vers l'app de
// cette matière avec leur nom et leur code.
//
// Pour ajouter une matière :
//   1. Copier le bloc "histoire" ci-dessous.
//   2. Donner un nouvel `id` (jamais réutiliser un id existant, il est
//      enregistré dans Firestore sur chaque groupe).
//   3. Adapter `nom`, `description`, `icone` (voir la liste d'icônes
//      importées plus bas, ou en ajouter une depuis "lucide-react"),
//      `couleur` (voir src/config/couleurs.ts pour les choix disponibles),
//      `urlEleve` (l'app externe vers laquelle rediriger l'élève) et
//      `unites` (les chapitres/périodes que le prof peut déverrouiller).
//   4. Mettre `actif: true` pour qu'elle apparaisse dans le portail.
//
// Une matière avec `actif: false` reste dans le registre (les groupes déjà
// créés avec cette matière continuent de fonctionner) mais n'apparaît plus
// dans la liste proposée lors de la création d'un nouveau groupe.
// ---------------------------------------------------------------------------

// Pour une nouvelle matière, importer ici l'icône lucide-react voulue
// (voir https://lucide.dev/icons pour la liste complète), par ex.:
// import { Calculator, FlaskConical, Globe2, Languages, Palette } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UniteMatiere } from '../types';
import type { CouleurMatiere } from './couleurs';

export interface Matiere {
  id: string;
  nom: string;
  description: string;
  icone: LucideIcon;
  couleur: CouleurMatiere;
  /** Construit l'URL de redirection de l'app élève pour cette matière. */
  urlEleve: (info: { nom: string; code: string }) => string;
  /** Chapitres / périodes que le prof peut déverrouiller pour un groupe. */
  unites: UniteMatiere[];
  /** Décrit la matière au modèle de langage pour générer un bilan pertinent. */
  contextePourBilanIA: string;
  actif: boolean;
}

const PERIODES_HISTOIRE: UniteMatiere[] = [
  { id: 1, titre: "Des origines à 1608 : L'expérience des Autochtones et le projet de colonie" },
  { id: 2, titre: "1608-1760 : L'évolution de la société coloniale" },
  { id: 3, titre: "1760-1791 : La Conquête et le changement d'empire" },
  { id: 4, titre: "1791-1840 : Les revendications et les luttes nationales" },
  { id: 5, titre: "1840-1896 : La formation du régime fédéral canadien" },
  { id: 6, titre: "1896-1945 : Les nationalismes et l'autonomie du Canada" },
  { id: 7, titre: "1945-1980 : La modernisation du Québec et la Révolution tranquille" },
  { id: 8, titre: "De 1980 à nos jours : Les choix de société dans le Québec contemporain" },
];

export const MATIERE_PAR_DEFAUT = 'histoire';

export const MATIERES: Matiere[] = [
  {
    id: 'histoire',
    nom: 'Histoire nationale',
    description: "Histoire du Québec et du Canada",
    icone: BookOpen,
    couleur: 'indigo',
    urlEleve: ({ nom, code }) =>
      `https://histoire4.corrige.moi/?nom=${encodeURIComponent(nom)}&code=${encodeURIComponent(code)}`,
    unites: PERIODES_HISTOIRE,
    contextePourBilanIA: "un enseignant d'histoire du Québec et du Canada",
    actif: true,
  },

  // --- Exemples prêts à activer ---------------------------------------
  // Décommenter et compléter (nom réel de l'app, unités, etc.) pour
  // ouvrir une nouvelle matière dans le portail. Elles n'apparaissent
  // nulle part tant que `actif` reste à `false`.
  //
  // {
  //   id: 'mathematiques',
  //   nom: 'Mathématiques',
  //   description: 'Résolution de situations-problèmes',
  //   icone: Calculator,
  //   couleur: 'sky',
  //   urlEleve: ({ nom, code }) =>
  //     `https://mathematiques.corrige.moi/?nom=${encodeURIComponent(nom)}&code=${encodeURIComponent(code)}`,
  //   unites: [{ id: 1, titre: 'Algèbre' }, { id: 2, titre: 'Géométrie' }],
  //   contextePourBilanIA: "un enseignant de mathématiques au secondaire",
  //   actif: false,
  // },
  // {
  //   id: 'francais',
  //   nom: 'Français',
  //   description: 'Écriture et compréhension de lecture',
  //   icone: Languages,
  //   couleur: 'rose',
  //   urlEleve: ({ nom, code }) =>
  //     `https://francais.corrige.moi/?nom=${encodeURIComponent(nom)}&code=${encodeURIComponent(code)}`,
  //   unites: [{ id: 1, titre: 'Grammaire' }, { id: 2, titre: 'Rédaction' }],
  //   contextePourBilanIA: "un enseignant de français au secondaire",
  //   actif: false,
  // },
  // {
  //   id: 'sciences',
  //   nom: 'Sciences',
  //   description: 'Science et technologie',
  //   icone: FlaskConical,
  //   couleur: 'emerald',
  //   urlEleve: ({ nom, code }) =>
  //     `https://sciences.corrige.moi/?nom=${encodeURIComponent(nom)}&code=${encodeURIComponent(code)}`,
  //   unites: [{ id: 1, titre: 'Univers vivant' }, { id: 2, titre: 'Univers matériel' }],
  //   contextePourBilanIA: "un enseignant de science et technologie au secondaire",
  //   actif: false,
  // },
  // {
  //   id: 'geographie',
  //   nom: 'Géographie',
  //   description: 'Géographie du monde contemporain',
  //   icone: Globe2,
  //   couleur: 'teal',
  //   urlEleve: ({ nom, code }) =>
  //     `https://geographie.corrige.moi/?nom=${encodeURIComponent(nom)}&code=${encodeURIComponent(code)}`,
  //   unites: [{ id: 1, titre: 'Territoire' }],
  //   contextePourBilanIA: "un enseignant de géographie au secondaire",
  //   actif: false,
  // },
  // {
  //   id: 'arts',
  //   nom: 'Arts plastiques',
  //   description: 'Création et appréciation en arts',
  //   icone: Palette,
  //   couleur: 'violet',
  //   urlEleve: ({ nom, code }) =>
  //     `https://arts.corrige.moi/?nom=${encodeURIComponent(nom)}&code=${encodeURIComponent(code)}`,
  //   unites: [{ id: 1, titre: 'Création' }],
  //   contextePourBilanIA: "un enseignant d'arts plastiques au secondaire",
  //   actif: false,
  // },
];

/** Retourne la matière demandée, ou la matière par défaut si absente/inconnue
 *  (cas des groupes créés avant l'introduction des matières). */
export function getMatiere(id: string | undefined | null): Matiere {
  return MATIERES.find(m => m.id === id) ?? MATIERES.find(m => m.id === MATIERE_PAR_DEFAUT)!;
}

/** Matières proposées lors de la création d'un nouveau groupe. */
export function matieresActives(): Matiere[] {
  return MATIERES.filter(m => m.actif);
}
