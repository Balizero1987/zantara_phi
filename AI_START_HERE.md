# 🚀 AI START HERE - ZANTARA PHI Monastery

## IMMEDIATE CONTEXT
**Project**: ZANTARA PHI - Monastero Digitale
**Philosophy**: Genera con AI premium (Claude/GPT), esegui con codice deterministico (φ)
**Location**: `/Users/antonellosiano/Desktop/ZANTARA PHI/monastery-stack/`
**Status**: DEVELOPMENT - Primo modulo aureo operativo

## ARCHITETTURA CORE
✅ **OPERATIVO**:
- TypeScript puro, zero dipendenze runtime
- GoldenTextSplitter con proporzioni auree
- Test suite Vitest
- Fallback deterministico per Orchestra

🟡 **IN SVILUPPO**:
- GoldenDocumentClassifier
- Cache aurea persistente

## FILOSOFIA CHIAVE
```typescript
const PHI = 1.618033988749895;  // Costante aurea

// Principi:
// 1. Genera 1 volta → Esegui ∞ volte
// 2. Zero API calls in runtime
// 3. Determinismo > Randomness
// 4. Matematica > Machine Learning
```

## FIRST ACTIONS (DO NOW)
```bash
# 1. Verifica ambiente
cd /Users/antonellosiano/Desktop/ZANTARA PHI/monastery-stack
cat HANDOVER_LOG.md  # Leggi ultima sessione

# 2. Install e test
npm install
npm run test:golden  # Verifica moduli aurei

# 3. Prova il primo modulo
echo "Test\n\nProva" > test.txt
npm run split test.txt

# 4. Vedi il rituale
npm run ritual
```

## 🧪 TESTING WORKFLOW
**REGOLA D'ORO**: Ogni modulo deve funzionare offline

```bash
# Test nuovo modulo
npm run test:golden

# Test specifico
npx vitest run src/modules/golden/text-splitter.test.ts

# Test completo
npm test
```

## GENERAZIONE MODULI CON CLAUDE/GPT

### 1. Carica il contesto
Apri Claude.ai o ChatGPT, incolla:
```
Sei un architetto di moduli aurei.
Ogni modulo deve:
- Essere deterministico
- Usare PHI = 1.618033988749895
- Zero dipendenze esterne
- Pattern matching > ML
```

### 2. Prompt esempio
```
Genera un GoldenDocumentClassifier che:
- Classifica testi in categorie (invoice, email, contract, report)
- Usa keyword weighted by Fibonacci
- Restituisce {type, confidence, features}
- TypeScript, export class GoldenDocumentClassifier
```

### 3. Salva e testa
```bash
# Salva in src/modules/golden/document-classifier.ts
# Crea test in src/modules/golden/document-classifier.test.ts
npm run test:golden
```

## 📦 STRUTTURA MODULI

```
src/modules/golden/
├── text-splitter.ts       # ✅ Divide con proporzioni auree
├── document-classifier.ts # 🔜 Classifica senza ML
├── keyword-extractor.ts   # 🔜 TF-IDF locale
└── pattern-matcher.ts     # 🔜 Geometria frattale
```

## WORKFLOW GIORNALIERO

### MATTINA (Generazione)
1. Apri Claude/GPT (già pagati)
2. Genera 1 modulo aureo
3. Test locale + commit

### POMERIGGIO (Ottimizzazione)
1. Benchmark performance
2. Refactor se necessario
3. Documentazione

### SERA (Review)
1. Update HANDOVER_LOG.md
2. Push su GitHub
3. Pianifica domani

## ⚠️ EVITARE
- ❌ Chiamate API in runtime
- ❌ Dipendenze pesanti (ML libs)
- ❌ Randomness non deterministica
- ❌ Automazione browser su Claude.ai
- ❌ Storing API keys nel codice

## ✅ PREFERIRE
- ✅ Matematica pura
- ✅ Pattern matching
- ✅ Proporzioni auree
- ✅ Cache deterministiche
- ✅ Test offline

## COMANDI UTILI

```bash
# Sviluppo
npm run split <file>     # Test splitter
npm run ritual           # Vedi workflow
npm run orchestra:demo   # Demo fallback

# Testing
npm test                 # Tutti i test
npm run test:golden      # Solo moduli aurei

# Git
git add .
git commit -m "✨ Add [module-name] with golden ratio"
git push
```

---

*Prima di iniziare, leggi HANDOVER_LOG.md per il contesto dell'ultima sessione*