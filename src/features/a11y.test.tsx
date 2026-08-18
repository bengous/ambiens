import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { axe } from "vitest-axe";
import type { Commune } from "@/api/geo";
import type { DebitStation } from "@/api/hydro";
import type { BilanReseau, ResultatDis } from "@/api/hubeau-qualite";
import type { NiveauNappe } from "@/api/piezo";
import { optionsHydro, optionsPiezo, optionsVigieau } from "@/api/queries";
import type { Restriction } from "@/api/vigieau";
import { SectionContexte } from "@/features/contexte/SectionContexte";
import { RechercheCommune } from "@/features/recherche/RechercheCommune";
import { ListeReseaux } from "@/features/verdict/FicheReseau";
import { VerdictGlobal } from "@/features/verdict/VerdictGlobal";
import type { Coordonnees } from "@/lib/geo-utils";

const INSEE = "74010";
const CENTRE: Coordonnees = [6.1264, 45.9024];

const COMMUNE: Commune = {
  nom: "Annecy",
  code: INSEE,
  codeDepartement: "74",
  codesPostaux: ["74000"],
  population: 130721,
  centre: { type: "Point", coordinates: [...CENTRE] },
};

function ligne(partiel: Partial<ResultatDis>): ResultatDis {
  return {
    code_prelevement: "P1",
    date_prelevement: "2026-04-09T09:00:00Z",
    libelle_parametre: "Paramètre",
    code_type_parametre: "N",
    resultat_numerique: 0,
    resultat_alphanumerique: "0",
    libelle_unite: "SANS OBJET",
    limite_qualite_parametre: null,
    reference_qualite_parametre: null,
    conclusion_conformite_prelevement: "Eau d'alimentation conforme.",
    conformite_limites_bact_prelevement: "C",
    conformite_limites_pc_prelevement: "C",
    conformite_references_bact_prelevement: "C",
    conformite_references_pc_prelevement: "C",
    nom_distributeur: "CA DU GRAND ANNECY",
    ...partiel,
  };
}

// Les trois tons de verdict et le désaccord sont représentés : axe voit tous
// les gabarits de badge et de ligne de tableau.
const BILANS: BilanReseau[] = [
  {
    reseau: { code: "074000198", nom: "ANNECY CENTRE", quartier: "Bourg" },
    prelevement: [
      ligne({
        libelle_parametre: "Escherichia coli /100mL - MF",
        resultat_numerique: 3,
        resultat_alphanumerique: "3",
        libelle_unite: "n/(100mL)",
        limite_qualite_parametre: "<=0 n/(100mL)",
      }),
      ligne({
        libelle_parametre: "pH",
        resultat_numerique: 7.6,
        resultat_alphanumerique: "7,6",
        libelle_unite: "unité pH",
        reference_qualite_parametre: ">=6,5 et <=9 unité pH",
      }),
      ligne({
        libelle_parametre: "Aspect (qualitatif)",
        code_type_parametre: "O",
        resultat_alphanumerique: "Eau limpide",
      }),
    ],
    evaluation: { verdict: "conforme", desaccord: true },
  },
  {
    reseau: { code: null, nom: "Réseau non identifié", quartier: null },
    prelevement: null,
    evaluation: { verdict: "indetermine", desaccord: false },
  },
];

const RESTRICTIONS: Restriction[] = [
  {
    code: "82_74_2",
    nom: "Fier",
    niveau: "alerte_renforcee",
    libelleNiveau: "Alerte renforcée",
    ordre: 2,
    dateDebut: "2026-08-01",
    dateFin: "2026-08-31",
    lienArrete: "https://example.invalid/arrete.pdf",
    usagesParticuliers: [
      {
        nom: "Arrosage des jardins potagers",
        thematique: "Arrosage",
        description: "Interdiction de 9 h à 20 h",
      },
    ],
  },
];

const DEBITS: DebitStation[] = [
  {
    code: "V1015010",
    nom: "Le Fier à Dingy-Saint-Clair",
    coursEau: "Le Fier",
    commune: "DINGY-SAINT-CLAIR",
    distanceKm: 6.2,
    debitM3s: 1.04,
    dateObs: "2026-08-18T06:00:00Z",
  },
  {
    code: "V1015020",
    nom: "Station sans mesure",
    coursEau: null,
    commune: null,
    distanceKm: 9.4,
    debitM3s: null,
    dateObs: null,
  },
];

const NAPPES: NiveauNappe[] = [
  {
    codeBss: "BSS004MZXK/X",
    commune: "Marigny-Saint-Marcel",
    distanceKm: 14.4,
    profondeurM: 2.79,
    niveauNgfM: 362.1,
    dateMesure: "2026-08-18T04:00:00Z",
  },
];

function clientEnsemence(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(optionsVigieau(INSEE).queryKey, RESTRICTIONS);
  client.setQueryData(optionsHydro(INSEE, CENTRE).queryKey, DEBITS);
  client.setQueryData(optionsPiezo(INSEE, CENTRE).queryKey, NAPPES);
  return client;
}

function rendre(noeud: ReactNode) {
  return render(
    <QueryClientProvider client={clientEnsemence()}>
      {noeud}
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Filet de sécurité : aucun test d'accessibilité ne doit toucher au réseau.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("appel réseau interdit ici"))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("VerdictGlobal ne présente aucune violation d'accessibilité", async () => {
  const { container } = rendre(
    <VerdictGlobal commune={COMMUNE} bilans={BILANS} />,
  );

  expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("FicheReseau ne présente aucune violation d'accessibilité", async () => {
  const { container } = rendre(<ListeReseaux bilans={BILANS} />);

  expect(screen.getByText("ANNECY CENTRE")).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("SectionContexte ne présente aucune violation d'accessibilité", async () => {
  const { container } = rendre(
    <SectionContexte insee={INSEE} centre={CENTRE} />,
  );

  for (const nom of [
    "Restrictions sécheresse",
    "Débit des rivières",
    "Niveau des nappes",
  ]) {
    fireEvent.click(screen.getByRole("button", { name: nom }));
  }

  expect(await screen.findByText("Zone Fier")).toBeInTheDocument();
  expect(screen.getByText("Le Fier à Dingy-Saint-Clair")).toBeInTheDocument();
  expect(screen.getByText("Marigny-Saint-Marcel")).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("RechercheCommune ne présente aucune violation d'accessibilité", async () => {
  const { container } = rendre(
    <RechercheCommune commune={COMMUNE} onCommune={() => undefined} />,
  );

  expect(screen.getByLabelText("Commune")).toHaveValue("Annecy (74)");
  expect(await axe(container)).toHaveNoViolations();
});
