import { useQuery } from "@tanstack/react-query";
import { GaugeIcon, MapPinIcon } from "lucide-react";
import { optionsHydro } from "@/api/queries";
import { EtatSection } from "@/components/EtatSection";
import { formatDebit, formatDistance, formatJour } from "@/features/formats";
import type { Coordonnees } from "@/lib/geo-utils";

interface PanneauHydroProps {
  insee: string;
  centre: Coordonnees;
}

export function PanneauHydro({ insee, centre }: PanneauHydroProps) {
  const requete = useQuery(optionsHydro(insee, centre));

  return (
    <EtatSection
      requete={requete}
      titreErreur="L'hydrométrie Hub'Eau est inaccessible"
      messageVide="Aucune station hydrométrique en service à moins de 20 km."
      estVide={(stations) => stations.length === 0}
    >
      {(stations) => (
        <ul className="flex flex-col gap-4">
          {stations.map((station) => (
            <li key={station.code} className="flex flex-col gap-1">
              <p className="font-medium">{station.nom}</p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-4" aria-hidden="true" />À{" "}
                  {formatDistance(station.distanceKm)}
                  {station.commune !== null && ` · ${station.commune}`}
                </span>
                {station.coursEau !== null && <span>{station.coursEau}</span>}
              </p>
              <p className="flex items-center gap-1.5 text-sm tabular-nums">
                <GaugeIcon className="size-4 shrink-0" aria-hidden="true" />
                Débit : {formatDebit(station.debitM3s)}
                {station.dateObs !== null &&
                  ` (le ${formatJour(station.dateObs)})`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </EtatSection>
  );
}
