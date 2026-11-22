# Real Kane captures (test fixtures)

These two files are unmodified copies of the real Kane runs made against the
Kern demo store on **2026-11-22**:

| Fixture | Original capture | sha256 |
|---|---|---|
| `observe-eligible-60.ndjson` | `.data/captures/2026-11-22-kane-store/observe-eligible-60.ndjson` | `e65c0b3e519a1a234216eb26458dc4391e5bf0467403aa58c441dd737609c99a` |
| `assert-eligible-60.ndjson` | `.data/captures/2026-11-22-kane-store/assert-eligible-60.ndjson` | `0465cd7b58fb53b4e733d57b8dba67303218185c11024e6f52d69a0b69c9a47a` |

They are committed so the parser tests are reproducible. The observe fixture
is a passed run with `observed_subtotal: "$60.00"` and
`observed_shipping: "$9.00"`. The assert fixture is a failed run with
`verdict.confirmed: true`, family `application_issue`, category
`ui_data_defect`, severity `major`, and an empty `final_state`.

`tests/kane-parse.test.ts` removes the final line of the observe fixture **in
memory** for the missing-`run_end` test. No terminal event is invented, and
the fixture files themselves are unchanged.
