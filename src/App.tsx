import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { centreCommune } from "@/api/geo";
import { optionsCommune, optionsQualite } from "@/api/queries";
import { EtatSection } from "@/components/EtatSection";
import { LogoAmbiens } from "@/components/LogoAmbiens";
import { Surtitre } from "@/components/Surtitre";
import { SectionContexte } from "@/features/contexte/SectionContexte";
import { DemanderIA } from "@/features/demander-ia/DemanderIA";
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
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <LogoAmbiens className="size-7 shrink-0" />
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Ambiens
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          L&apos;eau du robinet de votre commune, d&apos;après les contrôles
          sanitaires officiels.
        </p>
        <div
          aria-hidden="true"
          className="mt-3 h-px bg-linear-to-r from-eau-vif via-eau-trait to-transparent"
        />
      </header>

      <main className="flex flex-col gap-6 sm:gap-8">
        <RechercheCommune commune={commune} onCommune={choisirCommune} />

        <EtatSection requete={requeteCommune} titreErreur="Commune introuvable">
          {(trouvee) => (
            <div className="relative flex flex-col gap-6 sm:gap-8 sm:pl-8">
              {/* Rail de profondeur : eau traitée en haut, ressource en bas. */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-3 hidden w-px bg-linear-to-b from-eau-vif to-eau-profond sm:block"
              />
              <EtatSection
                requete={requeteQualite}
                titreErreur="Le contrôle sanitaire est inaccessible"
                messageVide="Aucun réseau de distribution n'est référencé pour cette commune."
                estVide={(bilans) => bilans.length === 0}
              >
                {(bilans) => (
                  <div className="flex flex-col gap-6">
                    <section className="flex flex-col gap-3">
                      <Surtitre>Au robinet</Surtitre>
                      <VerdictGlobal commune={trouvee} bilans={bilans} />
                      <DemanderIA commune={trouvee} bilans={bilans} />
                    </section>
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
