/**
 * Orchestra "free": qui non chiamiamo nulla per default.
 * Se vuoi, configura chiavi in .env e integra provider ufficiali
 * (consigliato: proteggi con rate-limit/cache in un gateway).
 */

const args = process.argv.slice(2);
const demo = args.includes("--demo");
const prompt = args.filter(a=>!a.startsWith("--")).join(" ").trim() || "Saluta il Monastero in 12 parole.";

function deterministicEcho(p: string) {
  // Fallback deterministico: zero API, zero sorprese.
  const words = p.split(/\s+/).filter(Boolean);
  const pick = (i: number) => words[i % words.length] ?? "φ";
  const out = [pick(0), pick(2), pick(4), "—", "φ", "guida", "il", "taglio", "non", "il", "caso", "🙂"];
  return out.join(" ");
}

if (demo) {
  console.log("🎻 Orchestra demo (deterministica):");
  console.log(deterministicEcho(prompt));
} else {
  console.log("Nessun provider esterno attivo. Usa `npm run orchestra:demo` per la demo.");
}