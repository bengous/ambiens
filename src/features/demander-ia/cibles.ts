export interface CibleIA {
  cle: "chatgpt" | "claude" | "perplexity";
  libelle: string;
  url: string;
}

export function construireCiblesIA(invite: string): CibleIA[] {
  const q = encodeURIComponent(invite);
  return [
    { cle: "chatgpt", libelle: "ChatGPT", url: `https://chatgpt.com/?q=${q}` },
    { cle: "claude", libelle: "Claude", url: `https://claude.ai/new?q=${q}` },
    {
      cle: "perplexity",
      libelle: "Perplexity",
      url: `https://www.perplexity.ai/search/new?q=${q}`,
    },
  ];
}
