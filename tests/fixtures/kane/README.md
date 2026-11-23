# Real Kane captures (sanitized test fixtures)

These are sanitized copies of the real Kane runs made against the Kern demo
store on **2026-11-22**. The run outcomes, amounts, verdict fields, credits and
evidence hashes are unchanged; the recording machine's home directory and Kane
session directories were replaced with `C:\Users\<user>` and `<session-dir>`.
The Test Manager share URLs remain (public references, not filesystem paths).

| Fixture | Original capture | Original capture SHA-256 | Sanitized fixture SHA-256 |
|---|---|---|---|
| `observe-eligible-60.ndjson` | `.data/captures/2026-11-22-kane-store/observe-eligible-60.ndjson` | `e65c0b3e519a1a234216eb26458dc4391e5bf0467403aa58c441dd737609c99a` | `8850671f9112ba2bf340982213e0b930195db4cfb6860b9c1ecc68d037b3fbc6` |
| `assert-eligible-60.ndjson` | `.data/captures/2026-11-22-kane-store/assert-eligible-60.ndjson` | `0465cd7b58fb53b4e733d57b8dba67303218185c11024e6f52d69a0b69c9a47a` | `2ec789f28311b262904f0c8bb74dccf184fbace72be4943560b39c83c71fc419` |

The observe fixture is a passed run with `observed_subtotal: "$60.00"` and
`observed_shipping: "$9.00"`. The assert fixture is a failed run with
`verdict.confirmed: true`, family `application_issue`, category
`ui_data_defect`, severity `major`, and an empty `final_state`.

`tests/kane-parse.test.ts` removes the final line of the observe fixture **in
memory** for the missing-`run_end` test. No terminal event is invented. The
committed fixtures were sanitized only for paths, not for run outcomes.
