import { useQuery } from "@tanstack/react-query";
import { DropletOffIcon, ExternalLinkIcon } from "lucide-react";
import { optionsVigieau } from "@/api/queries";
import { EtatSection } from "@/components/EtatSection";
import { Badge } from "@/components/ui/badge";
import { CLASSES_SECHERESSE, formatJour } from "@/features/formats";
import { cn } from "@/lib/utils";

export function PanneauVigieau({ insee }: { insee: string }) {
  const requete = useQuery(optionsVigieau(insee));

  return (
    <EtatSection
      requete={requete}
      titreErreur="VigiEau est inaccessible"
      messageVide="Aucune restriction sécheresse en vigueur sur l'eau potable de cette commune."
      estVide={(restrictions) => restrictions.length === 0}
    >
      {(restrictions) => (
        <ul className="flex flex-col gap-5">
          {restrictions.map((restriction) => (
            <li key={restriction.code} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-auto py-1 whitespace-normal",
                    CLASSES_SECHERESSE[restriction.niveau],
                  )}
                >
                  <DropletOffIcon aria-hidden="true" />
                  Restrictions sécheresse : {restriction.libelleNiveau}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Zone {restriction.nom}
                </span>
              </div>

              {(restriction.dateDebut !== null ||
                restriction.dateFin !== null) && (
                <p className="text-sm text-muted-foreground tabular-nums">
                  Arrêté en vigueur du {formatJour(restriction.dateDebut)} au{" "}
                  {formatJour(restriction.dateFin)}
                </p>
              )}

              {restriction.lienArrete !== null && (
                <a
                  href={restriction.lienArrete}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm underline underline-offset-3"
                >
                  Consulter l&apos;arrêté préfectoral
                  <ExternalLinkIcon className="size-4" aria-hidden="true" />
                </a>
              )}

              {restriction.usagesParticuliers.length > 0 && (
                <>
                  <h4 className="text-sm font-medium">
                    Usages restreints pour les particuliers (
                    {restriction.usagesParticuliers.length})
                  </h4>
                  <ul className="flex flex-col gap-2">
                    {restriction.usagesParticuliers.map((usage) => (
                      <li key={usage.nom}>
                        <p className="text-sm font-medium">{usage.nom}</p>
                        <p className="text-sm text-muted-foreground">
                          {usage.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </EtatSection>
  );
}
