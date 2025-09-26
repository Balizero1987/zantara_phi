import { describe, it, expect } from "vitest";
import { GoldenDocumentClassifier } from "./document-classifier";

const classifier = new GoldenDocumentClassifier();

describe("GoldenDocumentClassifier", () => {
  it("classifica correttamente una fattura", () => {
    const invoice = `INVOICE #2945\nBill To: PT Example Studio\nDue Date: 31 October 2024\n\nDescription           Qty   Unit Price   Amount\nBrand identity kit     1    $1,500.00    $1,500.00\nMaintenance Retainer   2    $350.00      $700.00\n\nSubtotal: $2,200.00\nTax (11%): $242.00\nTotal Amount Due: $2,442.00\n\nPayment Terms: Bank transfer within 7 days.`;
    const result = classifier.classify(invoice);
    expect(result.type).toBe("invoice");
    expect(result.scores.invoice).toBeGreaterThan(result.scores.email);
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it("riconosce una email con header e firma", () => {
    const email = `Subject: Marketing launch recap\nFrom: zero@balizero.com\nTo: team@balizero.com\nDate: 12 Sep 2024\n\nHi team,\n\nThanks for joining the launch sync earlier today.\nPlease review the attached deck and share questions by Friday.\n\nBest regards,\nZero\nzero@balizero.com`;
    const result = classifier.classify(email);
    expect(result.type).toBe("email");
    expect(result.scores.email).toBeGreaterThan(result.scores.report);
    expect(result.confidence).toBeGreaterThan(0.55);
  });

  it("identifica un contratto con clausole legali", () => {
    const contract = `SERVICE AGREEMENT\n\nTHIS AGREEMENT ("Agreement") is made on 12 March 2024.\nWHEREAS, the Parties desire to set forth the terms and conditions\nunder which Consultant shall provide services.\n\nThe Parties hereby agree as follows:\n1. Governing Law: Republic of Indonesia.\n2. Liability and indemnify provisions apply.\n3. Force Majeure clause is included.\n\nIN WITNESS WHEREOF, the Parties have executed this Agreement.\n\nSigned,\nPT Example Client\nConsultant Studio`;
    const result = classifier.classify(contract);
    expect(result.type).toBe("contract");
    expect(result.scores.contract).toBeGreaterThan(result.scores.letter);
    expect(result.confidence).toBeGreaterThan(0.55);
  });

  it("segnala un report strutturato", () => {
    const report = `Q3 PERFORMANCE REPORT\n\nExecutive Summary:\n- Revenue increased by 18% QoQ.\n- Customer churn reduced to 2.4%.\n\nIntroduction:\nThis report analyses marketing performance across channels.\n\nFindings:\nSECTION 1: SOCIAL\nSECTION 2: PAID MEDIA\n\nConclusion:\nNext steps include expanding the referral program.`;
    const result = classifier.classify(report);
    expect(result.type).toBe("report");
    expect(result.scores.report).toBeGreaterThan(result.scores.invoice);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("riconosce una lettera formale", () => {
    const letter = `Jakarta, 10 September 2024\n\nDear Maria,\n\nThank you for hosting us during the Bali retreat.\nThe team appreciated your hospitality and the insights shared.\n\nWe hope to see you again soon.\n\nSincerely,\nAntonello Siano\nBali Zero`;
    const result = classifier.classify(letter);
    expect(result.type).toBe("letter");
    expect(result.scores.letter).toBeGreaterThan(result.scores.email);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("gestisce testo vuoto restituendo bassa confidenza", () => {
    const result = classifier.classify("");
    expect(result.type).toBe("letter");
    expect(result.confidence).toBeLessThan(0.2);
  });

  it("classifyBatch elabora più documenti", () => {
    const results = classifier.classifyBatch(["Invoice 123", "Dear friend"]);
    expect(results).toHaveLength(2);
    expect(results[1].type).toBe("letter");
  });
});
