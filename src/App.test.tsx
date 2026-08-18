import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { axe } from "vitest-axe";
import App from "./App";

test("affiche le titre de l'application", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: "Potabilis" }),
  ).toBeInTheDocument();
});

test("ne présente aucune violation d'accessibilité", async () => {
  const { container } = render(<App />);

  expect(await axe(container)).toHaveNoViolations();
});
