# 🏛️ ZANTARA PHI Monastery - Digital Golden Analysis

[![Tests](https://img.shields.io/badge/tests-131%20passing-brightgreen)](./src/modules/golden/)
[![Golden Ratio](https://img.shields.io/badge/φ-1.618033988749895-gold)](https://en.wikipedia.org/wiki/Golden_ratio)
[![TypeScript](https://img.shields.io/badge/typescript-100%25-blue)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/runtime%20deps-0-green)](./package.json)

> *Un sistema completo di analisi testuale basato sulla proporzione aurea φ = 1.618033988749895*

## 🌟 Panoramica

ZANTARA PHI Monastery è un sistema avanzato di analisi testuale che utilizza algoritmi deterministici basati sulla **proporzione aurea** e la **sequenza di Fibonacci** per processare documenti senza dipendere da API esterne o modelli di machine learning.

### ✨ Caratteristiche Principali

- 🔢 **Zero API Calls**: Completamente deterministico e offline
- ⚡ **Performance**: Analisi completa <50ms con cache intelligente
- 🧪 **100% Testato**: 131 test automatici sempre passing
- 🌐 **Web Dashboard**: Interfaccia grafica completa su http://localhost:3618
- 📡 **API REST**: 4 endpoints per integrazione esterna
- 💾 **Cache Aurea**: Sistema intelligente con decay φ
- 🔍 **Multi-modalità**: Sezioni, keywords, pattern frattali

## 🚀 Quick Start

### Installazione

```bash
# Clone repository
git clone https://github.com/Balizero1987/zantara_phi.git
cd monastery-stack

# Install dependencies
npm install

# Run tests
npm run test:golden
```

### Utilizzo Immediato

```bash
# 🌐 Avvia web dashboard
npm run web
# Apri: http://localhost:3618

# 📊 Analisi via CLI
echo "Machine learning e AI stanno rivoluzionando il mondo" > test.txt
npm run pipeline test.txt

# 🔧 Moduli singoli
npm run split test.txt           # Text splitting aureo
npm run keywords test.txt 10     # Top 10 keywords TF-IDF
npm run patterns test.txt        # Pattern frattali
npm run cache demo               # Demo cache
```

## 🏗️ Architettura

Il sistema è composto da **7 moduli aurei** interconnessi:

1. **GoldenTextSplitter** - Divide testo usando proporzioni auree (38.2%, 61.8%)
2. **GoldenKeywordExtractor** - TF-IDF locale con pesi Fibonacci
3. **GoldenPatternMatcher** - Pattern recognition frattale a 5 livelli
4. **GoldenCache** - Cache intelligente con decay esponenziale aureo
5. **GoldenPipeline** - Orchestrazione integrata di tutti i moduli
6. **WebDashboard** - Interfaccia utente responsive
7. **API Server** - RESTful endpoints per integrazione

## 📊 Esempio Output

```json
{
  "summary": {
    "goldenRatio": 0.7234,
    "complexity": 0.8156,
    "confidence": 0.8923,
    "processingTime": 23
  },
  "sections": [{"ratio": 0.382, "importance": 1.000}],
  "keywords": [{"keyword": "machine learning", "score": 0.8234}],
  "patterns": [{"pattern": "Email complesse", "frequency": 1}]
}
```

## 🧪 Testing

```bash
npm run test:golden    # 131 test tutti passing ✅
npm test              # Test suite completa
```

## 📡 API REST

```bash
# Health check
curl http://localhost:3618/api/health

# Analisi completa
curl -X POST http://localhost:3618/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Il machine learning utilizza algoritmi complessi."}'
```

## 🔢 Filosofia Aurea

> **"Generate once, Execute forever"**

- 🤖 **AI per generazione**: Usa Claude/GPT per creare nuovi moduli
- 🔢 **Matematica per esecuzione**: Algoritmi deterministici per runtime
- 📐 **Proporzione aurea**: φ = 1.618033988749895 guida tutti i calcoli
- 🚫 **Zero dipendenze**: Nessuna API esterna in runtime

## 🏆 Achievements

- ✅ **131 test passing** (100% success rate)
- ✅ **Zero runtime dependencies**
- ✅ **Sub-50ms performance** con cache
- ✅ **Golden ratio algorithms** in tutti i moduli
- ✅ **Web dashboard completa** con API REST
- ✅ **Deterministic execution** (stesso input = stesso output)

---

*Costruito con la saggezza della proporzione aurea φ = 1.618033988749895* ✨

**🏛️ Il Monastero Digitale ti dà il benvenuto!**