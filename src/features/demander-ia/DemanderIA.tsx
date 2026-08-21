import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import type { Commune } from "@/api/geo";
import type { BilanReseau } from "@/api/hubeau-qualite";
import { optionsVigieau } from "@/api/queries";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { construireCiblesIA } from "@/features/demander-ia/cibles";
import { construireInvite } from "@/features/demander-ia/invite";
import { cn } from "@/lib/utils";

interface DemanderIAProps {
  commune: Commune;
  bilans: readonly BilanReseau[];
}

export function DemanderIA({ commune, bilans }: DemanderIAProps) {
  // `enabled: false` : l'invite se sert de la sécheresse si la section l'a déjà
  // chargée, elle ne déclenche jamais la requête elle-même.
  const { data: restrictions } = useQuery({
    ...optionsVigieau(commune.code),
    enabled: false,
  });
  // L'horloge est un état externe : la lire pendant le rendu rendrait le
  // composant non idempotent.
  const [maintenant] = useState(() => Date.now());
  const invite = construireInvite({
    commune,
    bilans,
    restrictions: restrictions ?? null,
    maintenant,
  });
  const cibles = construireCiblesIA(invite);
  const [copie, setCopie] = useState(false);
  // Sans cela le focus initial tombe dans l'invite : un lecteur d'écran
  // énoncerait 1 000 caractères avant la première action.
  const premiereCible = useRef<HTMLAnchorElement>(null);

  function copier() {
    void navigator.clipboard.writeText(invite).then(() => {
      setCopie(true);
      setTimeout(() => {
        setCopie(false);
      }, 2000);
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" className="min-h-11 w-fit" />}
      >
        <SparklesIcon aria-hidden="true" />
        Demander à une IA
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        initialFocus={premiereCible}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Demander à une IA</DialogTitle>
          <DialogDescription>
            L&apos;invite porte les résultats du contrôle affichés ici et un
            lien vers la méthode. L&apos;IA les explique et cherche seulement
            les alertes récentes.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          readOnly
          value={invite}
          rows={8}
          aria-label="Invite envoyée à l'IA"
          className="max-h-52 text-xs"
        />

        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {cibles.map((cible, rang) => (
              <a
                key={cible.cle}
                ref={rang === 0 ? premiereCible : null}
                href={cible.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-11",
                )}
              >
                {cible.libelle}
                <ExternalLinkIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">(ouvre un nouvel onglet)</span>
              </a>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={copier}
            className="min-h-11 w-full"
            aria-live="polite"
          >
            {copie ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
            {copie ? "Invite copiée" : "Copier l'invite"}
          </Button>
        </div>

        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4"
            />
          }
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">Fermer</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
