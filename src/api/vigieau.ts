import * as z from "zod";
import { API_VIGIEAU, TIMEOUT_VIGIEAU_MS } from "@/lib/constantes";
import { fetchJson } from "@/lib/fetch-json";
import { NIVEAUX_SECHERESSE, type NiveauGravite } from "@/lib/libelles";

export const schemaUsage = z.object({
  nom: z.string(),
  thematique: z.string(),
  description: z.string(),
  concerneParticulier: z.boolean(),
  concerneEntreprise: z.boolean(),
  concerneCollectivite: z.boolean(),
  concerneExploitation: z.boolean(),
});

export const schemaArrete = z.object({
  dateDebutValidite: z.string().nullable().optional(),
  dateFinValidite: z.string().nullable().optional(),
  cheminFichier: z.string().nullable().optional(),
});

export const schemaZone = z.object({
  id: z.number(),
  code: z.string(),
  nom: z.string(),
  type: z.string(),
  niveauGravite: z.enum(["vigilance", "alerte", "alerte_renforcee", "crise"]),
  departement: z.string(),
  arrete: schemaArrete.nullable().optional(),
  usages: z.array(schemaUsage),
});

export const schemaZones = z.array(schemaZone);

export type ZoneVigieau = z.infer<typeof schemaZone>;

export interface UsageRestreint {
  nom: string;
  thematique: string;
  description: string;
}

export interface Restriction {
  code: string;
  nom: string;
  niveau: NiveauGravite;
  libelleNiveau: string;
  ordre: number;
  dateDebut: string | null;
  dateFin: string | null;
  lienArrete: string | null;
  usagesParticuliers: UsageRestreint[];
}

export function mapperZone(zone: ZoneVigieau): Restriction {
  const gabarit = NIVEAUX_SECHERESSE[zone.niveauGravite];
  return {
    code: zone.code,
    nom: zone.nom,
    niveau: zone.niveauGravite,
    libelleNiveau: gabarit.libelle,
    ordre: gabarit.ordre,
    dateDebut: zone.arrete?.dateDebutValidite ?? null,
    dateFin: zone.arrete?.dateFinValidite ?? null,
    lienArrete: zone.arrete?.cheminFichier ?? null,
    usagesParticuliers: zone.usages
      .filter((usage) => usage.concerneParticulier)
      .map(({ nom, thematique, description }) => ({
        nom: nom.trim(),
        thematique,
        description,
      })),
  };
}

// Un tableau vide veut dire « aucune restriction en vigueur », pas une panne.
export async function fetchRestrictions(insee: string): Promise<Restriction[]> {
  const corps = await fetchJson(
    `${API_VIGIEAU}?commune=${insee}&zoneType=AEP`,
    TIMEOUT_VIGIEAU_MS,
  );
  return schemaZones
    .parse(corps)
    .map((zone) => mapperZone(zone))
    .sort((a, b) => b.ordre - a.ordre);
}
