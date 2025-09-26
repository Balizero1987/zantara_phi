import { PHI, goldenSplit } from "../modules/golden/text-splitter";

const ritual = {
  morning: [
    "Carica MONASTERY_CONTEXT.md in Claude/GPT",
    "Genera 1 modulo aureo (senza dipendenze esterne)",
    "Test locale + commit"
  ],
  afternoon: [
    "Controllo metriche (latenza, cache-hit, % richieste senza provider)",
    "Affina il modulo o prepara il prossimo"
  ],
  evening: [
    "Batch locali (cron) se servono",
    "Chiusura: appunta miglioramenti per domani"
  ]
};

console.log("⏳ Rituale del Monaco Digitale (φ =", PHI, ")");
for (const [k, steps] of Object.entries(ritual)) {
  console.log(`\n> ${k.toUpperCase()}`);
  steps.forEach((s, i) => console.log(`  ${i+1}. ${s}`));
}

// mini-demo: split di un testo campione
const sample = "Il Monastero vive della disciplina aurea. Scrivi al mattino, lascia correre di giorno, misura la sera.";
const demo = goldenSplit(sample, 3);
console.log("\n✨ Demo GoldenSplit:");
demo.forEach((d,i)=>console.log(`#${i+1} imp≈${d.importance.toFixed(3)} | ${d.content}`));