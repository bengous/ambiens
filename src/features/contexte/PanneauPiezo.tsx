import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLineIcon, MapPinIcon, RulerIcon } from "lucide-react";
import { optionsPiezo } from "@/api/queries";
import { EtatSection } from "@/components/EtatSection";
import { formatDistance, formatJour, formatMetres } from "@/features/formats";
import type { Coordonnees } from "@/lib/geo-utils";

interface PanneauPiezoProps {
  insee: string;
  centre: Coordonnees;
}

export function PanneauPiezo({ insee, centre }: PanneauPiezoProps) {
  const requete = useQuery(optionsPiezo(insee, centre));

  return (
    <EtatSection
      requete={requete}
      titreErreur="La piézométrie Hub'Eau est inaccessible"
      messageVide="Aucun piézomètre suivi à moins de 15 km."
      estVide={(nappes) => nappes.length === 0}
    >
      {(nappes) => (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Peu de piézomètres publient en temps réel : le plus proche peut se
            trouver à une quinzaine de kilomètres.
          </p>
          <ul className="flex flex-col gap-4">
            {nappes.map((nappe) => (
              <li key={nappe.codeBss} className="flex flex-col gap-1">
                <p className="font-medium">{nappe.commune ?? nappe.codeBss}</p>
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground tabular-nums">
                  <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />À{" "}
                  {formatDistance(nappe.distanceKm)} · code BSS {nappe.codeBss}
                </p>
                <p className="flex items-center gap-1.5 text-sm tabular-nums">
                  <ArrowDownToLineIcon
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Profondeur de la nappe : {formatMetres(nappe.profondeurM)}
                </p>
                <p className="flex items-center gap-1.5 text-sm tabular-nums">
                  <RulerIcon className="size-4 shrink-0" aria-hidden="true" />
                  Niveau NGF : {formatMetres(nappe.niveauNgfM)}
                  {nappe.dateMesure !== null &&
                    ` (le ${formatJour(nappe.dateMesure)})`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </EtatSection>
  );
}
