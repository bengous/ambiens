import { LocateFixedIcon, MapPinOffIcon } from "lucide-react";
import { useState } from "react";
import { communeAutourDe, type Commune } from "@/api/geo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const OPTIONS_GEOLOC: PositionOptions = {
  timeout: 10000,
  maximumAge: 5 * 60 * 1000,
};

const MESSAGES_ECHEC: Record<number, string> = {
  1: "Vous avez refusé le partage de position. Cherchez votre commune par son nom ou son code postal.",
  2: "Votre position n'a pas pu être déterminée. Cherchez votre commune par son nom ou son code postal.",
  3: "La localisation a pris trop de temps. Cherchez votre commune par son nom ou son code postal.",
};

interface BoutonAutourDeMoiProps {
  onCommune: (commune: Commune) => void;
}

export function BoutonAutourDeMoi({ onCommune }: BoutonAutourDeMoiProps) {
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  function localiser() {
    setEchec(null);
    setEnCours(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        communeAutourDe([position.coords.longitude, position.coords.latitude])
          .then((commune) => {
            setEnCours(false);
            if (commune) onCommune(commune);
            else
              setEchec(
                "Aucune commune française ne correspond à votre position.",
              );
          })
          .catch((erreur: unknown) => {
            setEnCours(false);
            setEchec(
              erreur instanceof Error
                ? erreur.message
                : "Le service de communes est inaccessible.",
            );
          });
      },
      (erreur) => {
        setEnCours(false);
        setEchec(MESSAGES_ECHEC[erreur.code] ?? erreur.message);
      },
      OPTIONS_GEOLOC,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        disabled={enCours}
        onClick={localiser}
      >
        {enCours ? <Spinner /> : <LocateFixedIcon />}
        {enCours ? "Localisation en cours…" : "Autour de moi"}
      </Button>
      {echec !== null && (
        <Alert>
          <MapPinOffIcon />
          <AlertTitle>Localisation indisponible</AlertTitle>
          <AlertDescription>{echec}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
