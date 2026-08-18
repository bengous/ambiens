import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Commune, CommuneRecherche } from "@/api/geo";
import { optionsRechercheCommunes } from "@/api/queries";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { libelleCommune } from "@/features/formats";
import { BoutonAutourDeMoi } from "./BoutonAutourDeMoi";

const DELAI_DEBOUNCE_MS = 300;
const SAISIE_MINIMALE = 2;
const CHAMP_COMMUNE = "champ-commune";

// Le champ se remplit aussi tout seul (choix d'un item, restauration d'URL) :
// seules ces causes-là relancent une recherche.
const CAUSES_DE_FRAPPE = new Set<string>([
  "input-change",
  "input-clear",
  "input-paste",
  "clear-press",
]);

interface RechercheCommuneProps {
  commune: Commune | null;
  onCommune: (insee: string) => void;
}

export function RechercheCommune({
  commune,
  onCommune,
}: RechercheCommuneProps) {
  const [saisie, setSaisie] = useState("");
  const [frappe, setFrappe] = useState("");
  const [requete, setRequete] = useState("");
  const [codeAffiche, setCodeAffiche] = useState<string | null>(null);

  // Restauration d'URL et bouton « Autour de moi » : le champ reflète la
  // commune analysée sans repasser par la liste de suggestions.
  if (commune !== null && commune.code !== codeAffiche) {
    setCodeAffiche(commune.code);
    setSaisie(libelleCommune(commune));
  }

  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRequete(frappe);
    }, DELAI_DEBOUNCE_MS);
    return () => {
      clearTimeout(minuteur);
    };
  }, [frappe]);

  const suggestions = useQuery(optionsRechercheCommunes(requete));
  const communes = suggestions.data ?? [];

  function messageListeVide(): string {
    if (frappe.trim().length < SAISIE_MINIMALE) {
      return "Tapez au moins 2 caractères.";
    }
    if (suggestions.isFetching) return "Recherche en cours…";
    if (suggestions.isError)
      return "La recherche de communes est indisponible.";
    return "Aucune commune trouvée. La recherche se fait par début de nom : vérifiez l'orthographe ou essayez le code postal.";
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Combobox
        items={communes}
        filter={null}
        autoHighlight
        itemToStringLabel={libelleCommune}
        isItemEqualToValue={(a: CommuneRecherche, b: CommuneRecherche) =>
          a.code === b.code
        }
        inputValue={saisie}
        onInputValueChange={(valeur, details) => {
          setSaisie(valeur);
          if (CAUSES_DE_FRAPPE.has(details.reason)) setFrappe(valeur);
        }}
        onValueChange={(choix: CommuneRecherche | null) => {
          if (choix !== null) {
            setCodeAffiche(choix.code);
            onCommune(choix.code);
          }
        }}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          {/* Combobox.Label ne nomme que le trigger : l'élément de formulaire
              est ici l'input, donc un <label> natif. */}
          <label htmlFor={CHAMP_COMMUNE} className="text-sm font-medium">
            Commune
          </label>
          <ComboboxInput
            id={CHAMP_COMMUNE}
            className="h-12 [&_[data-slot=input-group-control]]:h-full"
            placeholder="Nom de commune ou code postal"
            autoComplete="off"
            showTrigger={false}
          >
            <InputGroupAddon align="inline-start">
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
          </ComboboxInput>
        </div>
        <ComboboxContent>
          <ComboboxList>
            {communes.map((suggestion, index) => (
              <ComboboxItem
                key={suggestion.code}
                value={suggestion}
                index={index}
                className="min-h-11 flex-col items-start gap-0"
              >
                <span>{suggestion.nom}</span>
                <span className="text-xs text-muted-foreground">
                  {suggestion.codeDepartement}
                  {suggestion.codesPostaux?.[0]
                    ? ` · ${suggestion.codesPostaux[0]}`
                    : ""}
                </span>
              </ComboboxItem>
            ))}
          </ComboboxList>
          <ComboboxEmpty>{messageListeVide()}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      <BoutonAutourDeMoi
        onCommune={(trouvee) => {
          setCodeAffiche(trouvee.code);
          setSaisie(libelleCommune(trouvee));
          onCommune(trouvee.code);
        }}
      />
    </div>
  );
}
