import { getMatiere } from '../config/matieres';
import { PALETTES_COULEUR } from '../config/couleurs';

/** Badge affichant l'icône et le nom de la matière d'un groupe. */
export function BadgeMatiere({ matiereId }: { matiereId?: string }) {
  const matiere = getMatiere(matiereId);
  const palette = PALETTES_COULEUR[matiere.couleur];
  const Icone = matiere.icone;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded ${palette.bgClair} ${palette.texteFonce}`}>
      <Icone className="h-3.5 w-3.5" /> {matiere.nom}
    </span>
  );
}
