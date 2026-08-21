import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { Commune } from "@/api/geo";
import type { BilanReseau } from "@/api/hubeau-qualite";
import { DemanderIA } from "@/features/demander-ia/DemanderIA";

const COMMUNE: Commune = {
  nom: "Annecy",
  code: "74010",
  codeDepartement: "74",
  codesPostaux: ["74000"],
  population: 130721,
  centre: { type: "Point", coordinates: [6.1264, 45.9024] },
};

const BILANS: BilanReseau[] = [
  {
    reseau: { code: "074000198", nom: "ANNECY CENTRE", quartier: null },
    prelevement: null,
    evaluation: { verdict: "indetermine", desaccord: false },
  },
];

function ouvrir() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DemanderIA commune={COMMUNE} bilans={BILANS} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Demander à une IA/ }));
}

test("la modale propose les trois cibles en lien externe", () => {
  ouvrir();

  const attendus = [
    ["ChatGPT", "https://chatgpt.com/?q="],
    ["Claude", "https://claude.ai/new?q="],
    ["Perplexity", "https://www.perplexity.ai/search/new?q="],
  ];
  for (const [libelle, prefixe] of attendus) {
    const lien = screen.getByRole("link", { name: new RegExp(libelle) });
    expect(lien).toHaveAttribute("href", expect.stringContaining(prefixe));
    expect(lien).toHaveAttribute("target", "_blank");
    expect(lien.getAttribute("rel")).toContain("noopener");
  }
});

test("l'invite est affichée en lecture seule et copiable", async () => {
  const ecrire = vi.fn<(texte: string) => Promise<void>>(() =>
    Promise.resolve(),
  );
  // jsdom ne fournit pas `navigator.clipboard` : le poser sur le vrai
  // navigator évite de remplacer l'objet entier.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: ecrire },
    configurable: true,
  });

  ouvrir();

  const champ = screen.getByLabelText<HTMLTextAreaElement>(
    "Invite envoyée à l'IA",
  );
  expect(champ).toHaveAttribute("readonly");
  expect(champ.value).toContain("<tache>");

  fireEvent.click(screen.getByRole("button", { name: /Copier l'invite/ }));
  await vi.waitFor(() => {
    expect(ecrire).toHaveBeenCalledWith(expect.stringContaining("<donnees>"));
  });

  Reflect.deleteProperty(navigator, "clipboard");
});
