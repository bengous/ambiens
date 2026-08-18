import type { UseQueryResult } from "@tanstack/react-query";
import { TriangleAlertIcon, WifiOffIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface EtatSectionProps<T> {
  requete: UseQueryResult<T>;
  titreErreur: string;
  messageVide?: string;
  estVide?: (donnees: T) => boolean;
  squelette?: ReactNode;
  children: (donnees: T) => ReactNode;
}

function SqueletteParDefaut() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

export function EtatSection<T>({
  requete,
  titreErreur,
  messageVide = "Aucune donnée disponible pour cette commune.",
  estVide,
  squelette,
  children,
}: EtatSectionProps<T>) {
  // skipToken : la requête n'est pas partie, il n'y a rien à annoncer.
  if (requete.status === "pending" && requete.fetchStatus === "idle") {
    return null;
  }

  // TanStack Query met la requête en pause quand le navigateur se déclare hors
  // ligne, et la reprend au retour du réseau : sans ce cas, le squelette
  // tournerait indéfiniment.
  if (requete.fetchStatus === "paused") {
    return (
      <Alert>
        <WifiOffIcon />
        <AlertTitle>Connexion réseau perdue</AlertTitle>
        <AlertDescription>
          Le chargement reprendra automatiquement dès le retour de la connexion.
        </AlertDescription>
      </Alert>
    );
  }

  if (requete.status === "pending") {
    return (
      <output aria-live="polite" aria-busy="true" className="block">
        <span className="sr-only">Chargement en cours…</span>
        {squelette ?? <SqueletteParDefaut />}
      </output>
    );
  }

  if (requete.status === "error") {
    return (
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>{titreErreur}</AlertTitle>
        <AlertDescription>
          <p>{requete.error.message}</p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => void requete.refetch()}
          >
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (estVide?.(requete.data)) {
    return <p className="text-sm text-muted-foreground">{messageVide}</p>;
  }

  return <>{children(requete.data)}</>;
}
