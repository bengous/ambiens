import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { axe } from "vitest-axe";
import { creerClientRequetes } from "./api/queries";
import App from "./App";

function rendreApp() {
  return render(
    <QueryClientProvider client={creerClientRequetes()}>
      <App />
    </QueryClientProvider>,
  );
}

test("affiche le titre de l'application", () => {
  rendreApp();

  expect(
    screen.getByRole("heading", { name: "Potabilis" }),
  ).toBeInTheDocument();
});

test("ne présente aucune violation d'accessibilité", async () => {
  const { container } = rendreApp();

  expect(await axe(container)).toHaveNoViolations();
});
