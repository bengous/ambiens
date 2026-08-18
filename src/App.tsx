import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { centreCommune } from "@/api/geo";
import { optionsCommune, optionsQualite } from "@/api/queries";
import { EtatSection } from "@/components/EtatSection";
import { SectionContexte } from "@/features/contexte/SectionContexte";
import { RechercheCommune } from "@/features/recherche/RechercheCommune";
import { ListeReseaux } from "@/features/verdict/FicheReseau";
import { VerdictGlobal } from "@/features/verdict/VerdictGlobal";
import { ecrireCommuneUrl, lireCommuneUrl } from "@/lib/url";

function App() {
  const [insee, setInsee] = useState<string | null>(() => lireCommuneUrl());
  const requeteCommune = useQuery(optionsCommune(insee));
  const requeteQualite = useQuery(optionsQualite(insee));
  const commune = requeteCommune.data ?? null;

  function choisirCommune(code: string) {
    setInsee(code);
    ecrireCommuneUrl(code);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">Potabilis</h1>
        <p className="text-sm text-muted-foreground">
          L&apos;eau du robinet de votre commune, d&apos;après les contrôles
          sanitaires officiels.
        </p>
      </header>

      <main className="flex flex-col gap-8">
        <RechercheCommune commune={commune} onCommune={choisirCommune} />

        <EtatSection requete={requeteCommune} titreErreur="Commune introuvable">
          {(trouvee) => (
            <div className="flex flex-col gap-8">
              <EtatSection
                requete={requeteQualite}
                titreErreur="Le contrôle sanitaire est inaccessible"
                messageVide="Aucun réseau de distribution n'est référencé pour cette commune."
                estVide={(bilans) => bilans.length === 0}
              >
                {(bilans) => (
                  <div className="flex flex-col gap-6">
                    <VerdictGlobal commune={trouvee} bilans={bilans} />
                    <ListeReseaux bilans={bilans} />
                  </div>
                )}
              </EtatSection>

              <SectionContexte
                insee={trouvee.code}
                centre={centreCommune(trouvee)}
              />
            </div>
          )}
        </EtatSection>
      </main>

      <footer className="mt-auto border-t pt-4 text-xs text-muted-foreground">
        Sources : contrôle sanitaire SISE-Eaux (Hub&apos;Eau), API Géo, VigiEau,
        Hub&apos;Eau hydrométrie et piézométrie.
      </footer>
    </div>
  );
}

export default App;
