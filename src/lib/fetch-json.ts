// fetch NU, sans aucun en-tête : le moindre en-tête custom déclenche un préflight
// OPTIONS que le WAF de Hub'Eau bloque, alors que le GET simple passe (ACAO *).
export async function fetchJson(
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const hote = new URL(url).hostname;
  let reponse: Response;
  try {
    reponse = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (cause) {
    const delai = (timeoutMs / 1000).toFixed(0);
    const raison =
      cause instanceof DOMException && cause.name === "TimeoutError"
        ? `n'a pas répondu en ${delai} s`
        : "est injoignable";
    throw new Error(`Le service ${hote} ${raison}`, { cause });
  }
  // 206 = page partielle Hub'Eau ; response.ok l'accepte comme les 200.
  if (!reponse.ok) {
    throw new Error(`Le service ${hote} a répondu ${String(reponse.status)}`, {
      cause: reponse.status,
    });
  }
  const corps: unknown = await reponse.json();
  return corps;
}
