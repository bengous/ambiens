import { DropletOffIcon, DropletsIcon, LayersIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Coordonnees } from "@/lib/geo-utils";
import { PanneauHydro } from "./PanneauHydro";
import { PanneauPiezo } from "./PanneauPiezo";
import { PanneauVigieau } from "./PanneauVigieau";

interface SectionContexteProps {
  insee: string;
  centre: Coordonnees;
}

export function SectionContexte({ insee, centre }: SectionContexteProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">
        Contexte local — n&apos;affecte pas le verdict sanitaire
      </h2>
      <p className="text-sm text-muted-foreground">
        État de la ressource en eau autour de la commune. Ces mesures ne
        concernent pas la qualité de l&apos;eau du robinet.
      </p>

      {/* Sans defaultValue : tous les panneaux sont fermés au chargement. */}
      <Accordion multiple className="gap-2">
        <AccordionItem
          value="secheresse"
          className="rounded-lg border px-3 sm:px-4"
        >
          <AccordionTrigger className="gap-3">
            <span className="flex items-center gap-2">
              <DropletOffIcon className="size-4" aria-hidden="true" />
              Restrictions sécheresse
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <PanneauVigieau insee={insee} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="rivieres"
          className="rounded-lg border px-3 sm:px-4"
        >
          <AccordionTrigger className="gap-3">
            <span className="flex items-center gap-2">
              <DropletsIcon className="size-4" aria-hidden="true" />
              Débit des rivières
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <PanneauHydro insee={insee} centre={centre} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="nappes"
          className="rounded-lg border px-3 sm:px-4"
        >
          <AccordionTrigger className="gap-3">
            <span className="flex items-center gap-2">
              <LayersIcon className="size-4" aria-hidden="true" />
              Niveau des nappes
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <PanneauPiezo insee={insee} centre={centre} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
