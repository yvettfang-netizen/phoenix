# Education PR #38 source recheck

Rechecked: 2026-11-04 (Asia/Shanghai)

This note records a fresh read of the official Education Bureau school-location
JSON for PR #38. The recheck did not rewrite the checked-in dataset. The
download was kept at `C:\\Users\\Yvette\\AppData\\Local\\Temp\\education-edb-recheck-20261104.json`.

## Source and integrity

| Item | Evidence |
| --- | --- |
| Official URL | `https://www.edb.gov.hk/attachment/en/student-parents/sch-info/sch-search/sch-location-info/SCH_LOC_EDB.json` |
| Access date | 2026-11-04 (fresh download through the configured HTTP proxy) |
| HTTP status | 200 |
| HTTP `Last-Modified` | `Fri, 02 Oct 2026 08:30:44 GMT` (`2026-10-02`) |
| Download size | 4,312,418 bytes |
| Fresh SHA-256 | `6CE338319E4E09482CA2CD19DCFE909FFBD3203C6D6F299F2BA96E0402395709` |
| Checked-in source SHA-256 | Same value in `lib/data/education-schools-official.json` and importer constant |
| Fresh top-level records | 3,496 |
| Unique `SCHOOL NO.|SESSION` keys | 3,481 |
| Duplicate key groups | 15 groups, 30 rows in those groups (15 additional occurrences) |

The importer was run against the fresh file with the expected SHA-256. It
completed successfully and reported `records: 3496` and
`uniqueSourceKeys: 3481`. The generated records are semantically equal to the
checked-in records; the only byte-level difference is line ending formatting
(the checked-in JSON uses CRLF while the temporary output uses LF). The
checked-in provenance intentionally retains its original `retrievedOn` value
of `2026-11-03`; this document records the independent revalidation date.

## Source fields and published mappings

The mapping is implemented in `scripts/import-education-schools.mjs` and
consumed by `lib/education-school-records.ts`.

| Official source field | Stored field(s) | Mapping rule |
| --- | --- | --- |
| `SCHOOL NO.` | `sourceSchoolCode`, `sourceKey`, `entityId` | Preserved as source text; combined with `SESSION` for the source key. |
| `SESSION` | `sourceSession`, `sourceKey`, `entityId` | Preserved as source text; duplicate rows receive an ordinal suffix. |
| `ENGLISH CATEGORY` | `sourceEnglishCategory` | Preserved verbatim. |
| `中文類別` | `sourceChineseCategory` | Preserved verbatim. |
| `ENGLISH NAME` | `name.en` | Explicit source value. |
| `中文名稱` | `name.zh` | Explicit source value. |
| `STUDENTS GENDER` | `sourceGender`, `gender` | `CO-ED` → `coeducational`; `BOYS` → `boys`; `GIRLS` → `girls`. |
| `DISTRICT` | `sourceDistrict`, `district` | Preserved plus an explicit ID map for the 18 EDB district values. |
| `FINANCE TYPE` | `sourceFinanceType`, `funding` | `GOVERNMENT` → `government`; `AIDED` → `aided`; `DIRECT SUBSIDY SCHEME` → `direct-subsidy`; `PRIVATE` and `PRIVATE INDEPENDENT SCH SCHEME` → `private`; `CAPUT` and `ENGLISH SCHOOLS FOUNDATION` → `other`. |
| `SCHOOL LEVEL` | `sourceSchoolLevel`, `stageId` | `KINDERGARTEN` and `KINDERGARTEN-CUM-CHILD CARE CENTRES` → `kindergarten`; `PRIMARY` → `primary-schools`; `SECONDARY` → `secondary-schools`. |
| `WEBSITE` | `sourceWebsite`, `website`, `officialHomepage` | The source text is preserved; only an `http:`/`https:` URL with a valid URL parse and no credentials/control characters is exposed through the safe external-link helper. Invalid or missing values become `null`. |
| Import provenance | `sourceProvenance` and `EDUCATION_SCHOOLS_SOURCE` | URL, source last-modified date, SHA-256, original retrieval date, and source record count are retained. |

The fresh source also contains address, telephone, fax, religion, coordinate,
Chinese display, and related fields. Those fields are deliberately not mapped
to public Education knowledge fields in this candidate.

The source value domains observed in the fresh file are: four school levels
(`KINDERGARTEN`, `KINDERGARTEN-CUM-CHILD CARE CENTRES`, `PRIMARY`,
`SECONDARY`); three gender values (`BOYS`, `CO-ED`, `GIRLS`); seven finance
values (`AIDED`, `CAPUT`, `DIRECT SUBSIDY SCHEME`, `ENGLISH SCHOOLS
FOUNDATION`, `GOVERNMENT`, `PRIVATE`, `PRIVATE INDEPENDENT SCH SCHEME`); four
session values (`A.M.`, `EVENING`, `P.M.`, `WHOLE DAY`); and 18 districts.
All required importer fields were non-empty in the 3,496 fresh records.

## Fields that remain unverified

The EDB location source does not provide a verified value for curriculum,
teaching language, fees, legal form, non-profit status, kindergarten education
scheme participation, programme, admission requirements, or application
cycle. These fields remain empty or visibly pending in the Education model.
The implementation must not infer DSE, IB, A-Level, AP, language, fee level,
legal/non-profit status, or application timing from a school name, category,
finance type, website, or any other source field. Kindergarten source
categories must not be treated as equivalent to the primary/secondary
government-aided classification.

The imported institutions remain `candidate` records intended for the
explicit review/search surface. They are not evidence that the corresponding
school detail, programme, or guide is production-published. Public indexing,
robots, and sitemap exposure remain controlled by the site publication gates.

## Recheck commands

```text
HEAD https://www.edb.gov.hk/attachment/en/student-parents/sch-info/sch-search/sch-location-info/SCH_LOC_EDB.json
node scripts/import-education-schools.mjs --source <fresh-file> --output <temporary-output> --expected-sha256 6CE338319E4E09482CA2CD19DCFE909FFBD3203C6D6F299F2BA96E0402395709
```

No production database, migration, DNS, indexing, or deployment action was
performed during this recheck.
