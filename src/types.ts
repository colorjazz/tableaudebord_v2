// Types partagés du portail. Regroupés ici pour éviter les imports circulaires
// entre le tableau de bord admin, le tableau de bord prof et les écrans de connexion.

export interface UniteMatiere {
  id: number;
  titre: string;
}

export interface Groupe {
  id: string;
  nom: string;
  codes?: string[];
  prefixeBase: string;
  dateCreation: any;
  profId?: string;
  matiereId?: string; // absent sur les groupes créés avant l'ajout des matières -> défaut = matière historique
  periodesDebloquees?: number[]; // conserve ce nom de champ Firestore pour rester compatible avec les groupes existants
  codesUtilises?: Record<string, { nom: string; email: string; uid: string; date: any }>;
}

export interface Ecole {
  id: string;
  nom: string;
  prefixe: string;
  codesProfs?: string[];
  codesProfsUtilises?: Record<string, { email: string; uid: string; date: any }>;
  nbGroupes?: number;
  nbResultats?: number;
  tauxReussite?: number;
}

export interface ProfProfil {
  id: string;
  uid: string;
  email: string;
  codeUtilise: string;
  ecoleId: string;
  dateInscription: any;
}

export interface EleveActif {
  nom: string;
  code: string;
  email?: string;
}
