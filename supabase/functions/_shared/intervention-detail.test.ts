import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { resolveInterventionDetail } from "./intervention-detail.ts";

Deno.test("intervention detail: uses description first", () => {
  assertEquals(
    resolveInterventionDetail({
      description: "  Remplacement ballon électrique  ",
      questionnaire_answers: ["Autre réponse"],
    }),
    "Remplacement ballon électrique",
  );
});

Deno.test("intervention detail: falls back to first non-empty questionnaire answer", () => {
  assertEquals(
    resolveInterventionDetail({
      description: "   ",
      questionnaire_answers: ["", "  Remplacement ballon électrique  "],
    }),
    "Remplacement ballon électrique",
  );
});

Deno.test("intervention detail: supports JSON string answers", () => {
  assertEquals(
    resolveInterventionDetail({
      description: null,
      questionnaire_answers: JSON.stringify(["Remplacement ballon électrique"]),
    }),
    "Remplacement ballon électrique",
  );
});

Deno.test("intervention detail: returns null when empty", () => {
  assertEquals(resolveInterventionDetail(null), null);
  assertEquals(resolveInterventionDetail({ description: null, questionnaire_answers: [] }), null);
  assertEquals(resolveInterventionDetail({ description: " ", questionnaire_answers: [" "] }), null);
});
