import { expect, test } from "vitest";
import type { Commune } from "@/api/geo";
import type { BilanReseau, ResultatDis } from "@/api/hubeau-qualite";
import type { Restriction } from "@/api/vigieau";
import { formatEntier } from "@/features/formats";
import { construireCiblesIA } from "@/features/demander-ia/cibles";
import { construireInvite } from "@/features/demander-ia/invite";
import { URL_LLMS_TXT } from "@/lib/constantes";
import { VERDICTS } from "@/lib/libelles";

const COMMUNE: Commune = {
  nom: "Annecy",
  code: "74010",
  codeDepartement: "74",
  codesPostaux: ["74000"],
  population: 130721,
  centre: { type: "Point", coordinates: [6.1264, 45.9024] },
};

// Aucune fixture ne porte de non-conformité : celles-ci sont forgées.
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
    conclusion_conformite_prelevement: "Eau non conforme.",
    conformite_limites_bact_prelevement: "N",
    conformite_limites_pc_prelevement: "C",
    conformite_references_bact_prelevement: "C",
    conformite_references_pc_prelevement: "C",
    nom_distributeur: "CA DU GRAND ANNECY",
    ...partiel,
  };
}

const COLI = ligne({
  libelle_parametre: "Escherichia coli /100mL - MF",
  resultat_numerique: 3,
  resultat_alphanumerique: "3",
  libelle_unite: "n/(100mL)",
  limite_qualite_parametre: "<=0 n/(100mL)",
});

const PH = ligne({
  libelle_parametre: "pH",
  resultat_numerique: 5.4,
  resultat_alphanumerique: "5,4",
  libelle_unite: "unité pH",
  reference_qualite_parametre: ">=6,5 et <=9 unité pH",
});

const BILANS: BilanReseau[] = [
  {
    reseau: { code: "074000198", nom: "ANNECY CENTRE", quartier: null },
    prelevement: [COLI, PH],
    evaluation: { verdict: "non_conforme", desaccord: false },
  },
  {
    reseau: { code: null, nom: "Réseau non identifié", quartier: null },
    prelevement: null,
    evaluation: { verdict: "indetermine", desaccord: false },
  },
];

const RESTRICTION: Restriction = {
  code: "82_74_2",
  nom: "Fier",
  niveau: "alerte_renforcee",
  libelleNiveau: "Alerte renforcée",
  ordre: 2,
  dateDebut: "2026-08-01",
  dateFin: "2026-08-31",
  lienArrete: "https://example.invalid/arrete.pdf",
  usagesParticuliers: [],
};

const MAINTENANT = new Date("2026-04-20T10:00:00Z").getTime();

function inviteDecodee(url: string): string {
  const parametre = new URL(url).searchParams.get("q");
  expect(parametre).not.toBeNull();
  return parametre ?? "";
}

function inviteAnnecy(restrictions: Restriction[] | null = null): string {
  return construireInvite({
    commune: COMMUNE,
    bilans: BILANS,
    restrictions,
    maintenant: MAINTENANT,
  });
}

test("l'invite porte les quatre balises du contrat", () => {
  const invite = inviteAnnecy();
  for (const balise of ["<tache>", "<donnees>", "<source>", "<page>"]) {
    expect(invite).toContain(balise);
  }
});

test("l'invite pointe vers le mode d'emploi et le lien partageable", () => {
  const invite = inviteAnnecy();
  expect(invite).toContain(URL_LLMS_TXT);
  expect(invite).toContain("https://bengous.github.io/ambiens/?commune=74010");
});

test("les données embarquent le verdict, le réseau et la conclusion de l'ARS", () => {
  const invite = inviteAnnecy();
  expect(invite).toContain("Commune : Annecy (74), code INSEE 74010");
  expect(invite).toContain(VERDICTS.non_conforme.libelle);
  expect(invite).toContain(
    "Réseau ANNECY CENTRE — prélèvement du 9 avril 2026, distributeur CA DU GRAND ANNECY.",
  );
  expect(invite).toContain("Conclusion ARS : « Eau non conforme. »");
  expect(invite).toContain(
    "2 paramètres analysés (1 microbiologie, 1 physico-chimie), 2 dépassements.",
  );
  expect(invite).toContain("Réseau Réseau non identifié : aucun résultat");
});

test("chaque dépassement porte sa valeur alphanumérique et son seuil verbatim", () => {
  const invite = inviteAnnecy();
  expect(invite).toContain(
    "Escherichia coli /100mL - MF 3 n/(100mL) (seuil <=0 n/(100mL))",
  );
  expect(invite).toContain("pH 5,4 unité pH (seuil >=6,5 et <=9 unité pH)");
});

test("un prélèvement conforme ne liste aucun dépassement", () => {
  const invite = construireInvite({
    commune: COMMUNE,
    bilans: [
      {
        reseau: { code: "074000198", nom: "ANNECY CENTRE", quartier: null },
        prelevement: [ligne({ limite_qualite_parametre: "<=200 µg/L" })],
        evaluation: { verdict: "conforme", desaccord: false },
      },
    ],
    restrictions: null,
    maintenant: MAINTENANT,
  });
  expect(invite).toContain(
    "1 paramètre analysé (1 physico-chimie), 0 dépassement.",
  );
  expect(invite).not.toContain("Dépassements :");
});

test("le désaccord ARS/recalcul est signalé quand il existe", () => {
  const invite = construireInvite({
    commune: COMMUNE,
    bilans: [
      { ...BILANS[0], evaluation: { verdict: "conforme", desaccord: true } },
    ],
    restrictions: null,
    maintenant: MAINTENANT,
  });
  expect(invite).toContain("Désaccord : l'ARS conclut conforme");
  expect(inviteAnnecy()).not.toContain("Désaccord :");
});

test("la liste des dépassements est plafonnée à huit par réseau", () => {
  const douze = Array.from({ length: 12 }, (_, index) =>
    ligne({
      libelle_parametre: `Pesticide ${String(index)}`,
      resultat_numerique: 5,
      resultat_alphanumerique: "5",
      libelle_unite: "µg/L",
      limite_qualite_parametre: "<=0,1 µg/L",
    }),
  );
  const invite = construireInvite({
    commune: COMMUNE,
    bilans: [
      {
        reseau: { code: "074000198", nom: "ANNECY CENTRE", quartier: null },
        prelevement: douze,
        evaluation: { verdict: "non_conforme", desaccord: false },
      },
    ],
    restrictions: null,
    maintenant: MAINTENANT,
  });

  expect(invite).toContain(
    "12 paramètres analysés (12 physico-chimie), 12 dépassements.",
  );
  expect(invite).toContain("Pesticide 7 5 µg/L (seuil <=0,1 µg/L)");
  expect(invite).not.toContain("Pesticide 8");
  expect(invite).toContain("; et 4 autres");
});

test("le détail cumulé s'arrête à douze dépassements sur toute l'invite", () => {
  const reseau = (nom: string): BilanReseau => ({
    reseau: { code: nom, nom, quartier: null },
    prelevement: Array.from({ length: 8 }, (_, index) =>
      ligne({
        libelle_parametre: `${nom} pesticide ${String(index)}`,
        resultat_numerique: 5,
        resultat_alphanumerique: "5",
        libelle_unite: "µg/L",
        limite_qualite_parametre: "<=0,1 µg/L",
      }),
    ),
    evaluation: { verdict: "non_conforme", desaccord: false },
  });
  const invite = construireInvite({
    commune: COMMUNE,
    bilans: [reseau("A"), reseau("B"), reseau("C")],
    restrictions: null,
    maintenant: MAINTENANT,
  });

  expect(invite.split("(seuil ")).toHaveLength(13);
  expect(invite).toContain("B pesticide 3 5 µg/L (seuil <=0,1 µg/L)");
  expect(invite).toContain("; et 4 autres");
  expect(invite).not.toContain("C pesticide");
  // Le compte reste juste même quand le détail s'arrête.
  expect(
    invite.split("8 paramètres analysés (8 physico-chimie), 8 dépassements."),
  ).toHaveLength(4);
});

test("la sécheresse n'apparaît que si le cache VigiEau la porte déjà", () => {
  expect(inviteAnnecy()).not.toContain("Sécheresse");
  expect(inviteAnnecy([])).not.toContain("Sécheresse");
  expect(inviteAnnecy([RESTRICTION])).toContain(
    "Sécheresse (VigiEau) : Alerte renforcée — Fier.",
  );
});

test("la ligne sécheresse retient la zone la plus grave", () => {
  const invite = inviteAnnecy([
    {
      ...RESTRICTION,
      nom: "Usses",
      niveau: "vigilance",
      libelleNiveau: "Vigilance",
      ordre: 0,
    },
    RESTRICTION,
  ]);
  expect(invite).toContain("Alerte renforcée — Fier.");
  expect(invite).not.toContain("Vigilance");
});

test("chaque cible reçoit la même invite, décodable depuis son URL", () => {
  const invite = inviteAnnecy([RESTRICTION]);
  const cibles = construireCiblesIA(invite);

  expect(cibles.map((cible) => cible.cle)).toStrictEqual([
    "chatgpt",
    "claude",
    "perplexity",
  ]);
  for (const cible of cibles) {
    expect(inviteDecodee(cible.url)).toBe(invite);
  }
});

// L'invite embarque une synthèse : sa taille suit les données, et ce plafond
// est le seul garde-fou contre une URL que les cibles tronqueraient.
test("l'URL générée reste sous 6 000 caractères dans le pire cas", () => {
  // 62 caractères : le plus long libellé de la fixture SISE-Eaux réelle.
  const nomLong = (prefixe: string, index: number) =>
    `${prefixe}${String(index)} de 4 substances perfluoroalkylées (PFOA+PFNA+PFHXS)`;
  const prelevement = [
    ...Array.from({ length: 12 }, (_, index) =>
      ligne({
        libelle_parametre: nomLong("Somme", index),
        resultat_alphanumerique: "5",
        libelle_unite: "µg/L",
        limite_qualite_parametre: "<=0,1 µg/L",
      }),
    ),
    ...Array.from({ length: 40 }, (_, index) =>
      ligne({
        libelle_parametre: nomLong("Total", index),
        resultat_alphanumerique: "0,0196",
        libelle_unite: "mg/L",
        reference_qualite_parametre: "<=0,7 mg/L",
      }),
    ),
  ];
  const reseau: BilanReseau = {
    reseau: {
      code: "074000198",
      nom: "SYNDICAT INTERCOMMUNAL DES EAUX DU BAS-CHABLAIS",
      quartier: "Quartier nord",
    },
    prelevement,
    evaluation: { verdict: "non_conforme", desaccord: true },
  };
  const invite = construireInvite({
    commune: {
      ...COMMUNE,
      nom: "Saint-Remy-en-Bouzemont-Saint-Genest-et-Isson",
    },
    bilans: Array.from({ length: 30 }, () => reseau),
    restrictions: [
      {
        ...RESTRICTION,
        usagesParticuliers: Array.from({ length: 6 }, (_, index) => ({
          nom: `Usage restreint numéro ${String(index)}`,
          thematique: "Arrosage",
          description:
            "Interdiction de 9 h à 20 h sauf dérogation préfectorale",
        })),
      },
    ],
    maintenant: MAINTENANT,
  });

  for (const cible of construireCiblesIA(invite)) {
    expect(cible.url.length).toBeLessThan(6000);
  }
});

test("au-delà de trois réseaux, les autres sont résumés sans être perdus", () => {
  const reseau = (
    nom: string,
    verdict: BilanReseau["evaluation"]["verdict"],
  ) => ({
    reseau: { code: nom, nom, quartier: null },
    prelevement: [ligne({ libelle_parametre: `Nitrates ${nom}` })],
    evaluation: { verdict, desaccord: false },
  });
  const invite = construireInvite({
    commune: COMMUNE,
    bilans: [
      reseau("A", "conforme"),
      reseau("B", "conforme"),
      reseau("C", "conforme"),
      reseau("D", "conforme"),
      reseau("GRAVE", "non_conforme"),
    ],
    restrictions: null,
    maintenant: MAINTENANT,
  });

  // Le réseau non conforme passe devant : il ne peut pas tomber dans le résumé.
  expect(invite).toContain("Réseau GRAVE —");
  expect(invite).toContain(
    "Et 2 autres réseaux, non détaillés ici : 2 eau conforme.",
  );
});

test("les mesures quantifiées sont listées, les non détectés comptés", () => {
  const invite = construireInvite({
    commune: COMMUNE,
    bilans: [
      {
        reseau: { code: "074000198", nom: "ANNECY CENTRE", quartier: "Bourg" },
        prelevement: [
          ligne({
            libelle_parametre: "Nitrates (en NO3)",
            resultat_alphanumerique: "12",
            libelle_unite: "mg/L",
            limite_qualite_parametre: "<=50 mg/L",
          }),
          ligne({
            libelle_parametre: "Titre hydrotimétrique",
            resultat_alphanumerique: "29,6",
            libelle_unite: "°f",
          }),
          ligne({
            libelle_parametre: "Glyphosate",
            resultat_alphanumerique: "<0,020",
            libelle_unite: "µg/L",
            limite_qualite_parametre: "<=0,1 µg/L",
          }),
          ligne({
            libelle_parametre: "Atrazine",
            resultat_alphanumerique: "<0,005",
            libelle_unite: "µg/L",
            limite_qualite_parametre: "<=0,1 µg/L",
          }),
        ],
        evaluation: { verdict: "conforme", desaccord: false },
      },
    ],
    restrictions: null,
    maintenant: MAINTENANT,
  });

  expect(invite).toContain("Nitrates (en NO3) 12 mg/L (seuil <=50 mg/L)");
  expect(invite).toContain("Titre hydrotimétrique 29,6 °f");
  expect(invite).toContain(
    "Non détectés : 2 paramètres sous le seuil de quantification.",
  );
  expect(invite).not.toContain("Glyphosate");
  expect(invite).toContain("Réseau ANNECY CENTRE (Bourg)");
});

test("un paramètre répété ne sort qu'une fois, et le relevé de terrain est écarté", () => {
  const conductivite = (valeur: string) =>
    ligne({
      libelle_parametre: "Conductivité à 25°C",
      resultat_alphanumerique: valeur,
      libelle_unite: "µS/cm",
    });
  const invite = construireInvite({
    commune: COMMUNE,
    bilans: [
      {
        reseau: { code: "074000198", nom: "ANNECY CENTRE", quartier: null },
        prelevement: [
          conductivite("572"),
          conductivite("567"),
          ligne({
            libelle_parametre: "Pluviométrie-48h",
            resultat_alphanumerique: "0",
            libelle_unite: "mm/48h",
          }),
        ],
        evaluation: { verdict: "conforme", desaccord: false },
      },
    ],
    restrictions: null,
    maintenant: MAINTENANT,
  });

  expect(invite).toContain("Conductivité à 25°C 572 µS/cm");
  expect(invite).not.toContain("567");
  expect(invite).not.toContain("Pluviométrie");
});

test("un prélèvement de plus de six mois porte un avertissement de fraîcheur", () => {
  const vieux = construireInvite({
    commune: COMMUNE,
    bilans: BILANS,
    restrictions: null,
    maintenant: new Date("2027-04-20T10:00:00Z").getTime(),
  });
  expect(vieux).toContain("Fraîcheur : prélèvement de plus de six mois");
  expect(inviteAnnecy()).not.toContain("Fraîcheur :");
});

test("les usages restreints accompagnent le niveau de sécheresse", () => {
  const invite = inviteAnnecy([
    {
      ...RESTRICTION,
      usagesParticuliers: [
        {
          nom: "Arrosage des jardins potagers",
          thematique: "Arrosage",
          description: "Interdiction de 9 h à 20 h",
        },
      ],
    },
  ]);
  expect(invite).toContain(
    "Usages restreints : Arrosage des jardins potagers : Interdiction de 9 h à 20 h",
  );
});

test("la tâche situe la date du jour et les données la population", () => {
  const invite = inviteAnnecy();
  expect(invite).toContain("Nous sommes le 20 avril 2026.");
  expect(invite).toContain(`${formatEntier(130721)} habitants.`);
});
