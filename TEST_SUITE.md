# 🧪 ZANTARA PHI - Test Suite

## 🔑 Configurazione Base

```bash
# Setup iniziale (repo clonato)
cd zantara_phi
npm install

# Copia configurazione
cp .env.example .env
```

## ✅ Moduli Aurei (Deterministici)

### 1. GoldenTextSplitter
```bash
# Test CLI base
echo "Prima sezione.\n\nSeconda sezione importante.\n\nTerza sezione." > sample.txt
npm run split sample.txt

# Output atteso:
# #1  ratio=38.2%  imp≈0.618  Prima sezione.
# #2  ratio=61.8%  imp≈0.382  Seconda sezione importante.
# #3  ratio=100.0%  imp≈0.236  Terza sezione.

# Test con JSON output
npm run split sample.txt -- --json

# Test unitari
npm run test:golden
# Expected: 2/2 passing
```

### 2. GoldenDocumentClassifier
```bash
# Test CLI classificatore
echo "Invoice 1001 total due $450" > sample-invoice.txt
npm run classify sample-invoice.txt

# Output atteso (estratto):
# 🔮 Golden Document Classifier (φ = 1.618033988749895)
# Type: invoice
# Confidence: >60%

# JSON output
echo "Subject: Team update\nFrom: zero@balizero.com" > sample-email.txt
npm run classify sample-email.txt -- --json

# Test unitari dedicati
npx vitest run src/modules/golden/document-classifier.test.ts
```

### 3. Rituale Giornaliero
```bash
npm run ritual

# Output atteso:
# ⏳ Rituale del Monaco Digitale (φ = 1.618033988749895)
#
# > MORNING
#   1. Carica MONASTERY_CONTEXT.md in Claude/GPT
#   2. Genera 1 modulo aureo (senza dipendenze esterne)
#   3. Test locale + commit
# ...
```

### 4. Orchestra Demo (Fallback Deterministico)
```bash
npm run orchestra:demo

# Output atteso:
# 🎻 Orchestra demo (deterministica):
# Saluta Monastero 12 — φ guida il taglio non il caso 🙂
```

## 📊 Test di Performance

### Benchmark GoldenSplitter
```bash
# Crea file di test grande
for i in {1..100}; do
  echo "Paragrafo $i con contenuto.\n" >> big.txt
done

# Misura tempo
time npm run split big.txt > /dev/null

# Expected: < 100ms per file < 10KB
```

### Memory Usage
```bash
# Monitora memoria durante esecuzione
/usr/bin/time -l npm run split big.txt 2>&1 | grep "maximum resident"

# Expected: < 50MB RSS
```

## 🔄 Test di Integrazione

### Pipeline Completa
```bash
#!/bin/bash
# test-pipeline.sh

echo "📋 Test Pipeline Monastero"

# 1. Test modulo aureo
echo "Test 1: GoldenSplitter"
echo "A\n\nB\n\nC" | RUN_AS_CLI=1 npx tsx src/modules/golden/text-splitter.ts
[ $? -eq 0 ] && echo "✅ Pass" || echo "❌ Fail"

# 2. Test rituale
echo "Test 2: Rituale"
npm run ritual > /dev/null 2>&1
[ $? -eq 0 ] && echo "✅ Pass" || echo "❌ Fail"

# 3. Test orchestra
echo "Test 3: Orchestra"
npm run orchestra:demo > /dev/null 2>&1
[ $? -eq 0 ] && echo "✅ Pass" || echo "❌ Fail"

echo "📊 Pipeline completata"
```

## 🚀 Quick Test All

```bash
# Esegui tutti i test
npm test

# Solo moduli aurei
npm run test:golden

# Con coverage
npx vitest run --coverage
```

## 🛠️ Automazione Watch & Export

```bash
mkdir -p incoming exports
WATCH_FORMATS=json npm run watch
```

- Input di default: `incoming/` (override con `WATCH_INPUT_DIR`)
- Output di default: `exports/` (override con `WATCH_OUTPUT_DIR`)
- Formati supportati: `json`, `pdf` (override con `WATCH_FORMATS`)

Il watcher utilizza la pipeline completa (classificatore incluso) e salva automaticamente gli export dei documenti osservati.

## 📈 Metriche Target

| Metrica | Target | Attuale |
|---------|--------|---------|
| Test Coverage | > 80% | - |
| Response Time | < 100ms | ✅ |
| Memory Usage | < 50MB | ✅ |
| API Calls | 0 | ✅ |
| Dipendenze Runtime | 0 | ✅ |

## 🔍 Debug

```bash
# Verbose output
DEBUG=* npm run split sample.txt

# Node inspect
node --inspect-brk node_modules/.bin/tsx src/modules/golden/text-splitter.ts sample.txt
```

---

*Aggiorna questo file ogni volta che aggiungi un nuovo modulo o test*
