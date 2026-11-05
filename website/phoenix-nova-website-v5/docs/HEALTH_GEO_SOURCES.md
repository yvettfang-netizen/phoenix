# Phoenix Nova™ Health V3.0 GEO source register

Status: draft / noindex / Founder review required

Last checked: 2026-11-02
Content contract: `lib/health-geo-content.ts`

This register is a source boundary, not a medical-provider directory. The
Health GEO records describe non-clinical preparation and navigation only.
They do not diagnose, recommend treatment, determine eligibility, promise
appointments, state visa or entry outcomes, quote a guaranteed price, or
promise insurance payment. A source about one provider or one pilot must not
be generalised to all Shenzhen or Greater Bay Area providers.

The web research CLI described by the local Agent Reach skill was unavailable
in this environment. The supplied official URLs were therefore checked with
the approved read-only web reader fallback. Direct retrieval of the NHC rule
page returned an access error, so its scope is recorded from the official NHC
search result and linked page; it must be rechecked before public indexing.

## Source register

| ID | Publisher / source | URL | Fact/link scope | Explicit boundary |
| --- | --- | --- | --- | --- |
| `eyeshenzhen-international-services-2026` | Amazing Shenzhen / Shenzhen Media Group | <https://www.eyeshenzhen.com/content/2026-01/16/content_31904902.htm> | Named Shenzhen institutions with publicly described international departments or services; article reference to the “健康深圳” appointment route | Official city-media list is not exhaustive and is not a Phoenix partnership or acceptance guarantee. Do not copy a named institution's service, language, insurer or room description to another institution. |
| `sysu-international-center-shenzhen-2026` | Sun Yat-sen University | <https://www.sysu.edu.cn/sysuen/info/1023/58451.htm> | The Eighth Affiliated Hospital of Sun Yat-sen University International Medical Center launch and its own bilingual/service statement | Institution-specific announcement only. It cannot establish that every Shenzhen provider offers bilingual care, international insurance, or the same specialties. |
| `nhc-hong-kong-macao-physician-short-term-practice-rule` | National Health Commission of the PRC | <https://www.nhc.gov.cn/wjw/c100221/202201/55f3e85ddf12403388b0f00739407444.shtml> | Registration, employing institution, practice location/category/scope and certificate checks for Hong Kong/Macao physicians practising short-term in Mainland China | Does not decide an individual's licence. Current application materials and authority must be confirmed with Shenzhen health authorities and the employing institution. |
| `nhc-public-health-information-search` | National Health Commission of the PRC | <https://zwfw.nhc.gov.cn/cxx/> | Official entry points for physician and hospital practice-registration searches | Search results and fields can change; use the current official result, not an old copy or third-party profile. |
| `shenzhen-health-commission-provider-and-physician-directory` | Shenzhen Municipal Health Commission | <https://wjw.sz.gov.cn/bmfw/wycx/hygl/wjglbm/index.html> | Shenzhen medical-institution name and physician-registration query entry points | A query entry is not a recommendation, partnership, quality ranking or appointment confirmation. |
| `shenzhen-health-commission-physician-registration` | Shenzhen Municipal Health Commission | <https://wjw.sz.gov.cn/ztzl/yszyzc/> | Shenzhen physician registration authority and published handling conditions | Does not prove that a named or advertised doctor has a particular current scope. |
| `shenzhen-health-commission-institution-registration-rules` | Shenzhen Municipal Health Commission | <https://wjw.sz.gov.cn/gkmlpt/content/7/7391/post_7391852.html> | Requirement to obtain medical-institution practice registration or filing before operation; regulatory allocation of registration | Current institution licence, site and business scope still need an official-record check. |
| `hk-government-cross-boundary-healthcare-2026` | Hong Kong SAR Government | <https://www.info.gov.hk/gia/general/202602/25/P2026022500444p.htm> | Hong Kong Government description of cross-boundary healthcare pilots, designated institutions and eHealth functions for specific groups | Pilot scope and designated institutions are not universal eligibility or acceptance. |
| `hk-government-cross-boundary-insurance-arrangements-2024` | Hong Kong SAR Government | <https://www.info.gov.hk/gia/general/202407/17/P2024071700469p.htm> | Government description of individual insurers' pre-approval and direct-claim arrangements with Mainland institutions | An individual insurer arrangement is not universal policy coverage or a Phoenix service commitment. |
| `hong-kong-insurance-authority-medical-claims-guidance` | Insurance Authority Hong Kong | <https://www.ia.org.hk/en/medical_insurance/tips_on_making_claims.html> | Claim deadlines, pre-authorisation, common documents, final claim decisions, and reasonable-and-customary charges | Coverage, exclusions, limits and final payment follow the policy and insurer decision. No claim guarantee. |
| `hong-kong-insurance-authority-policyholder-protection` | Insurance Authority Hong Kong | <https://www.ia.org.hk/en/medical_insurance/protection_of_policy_holders.html> | Authorisation/licensing of insurers and intermediaries and complaint information | The regulator does not decide the merits or amount of an individual claim. |
| `shenzhen-healthcare-security-medical-service-prices` | Shenzhen Healthcare Security Bureau | <https://hsa.sz.gov.cn/zwfw/mdml/ylfwxmjg/index.html> | Shenzhen medical-service price-item catalogues and update dates | A catalogue is not a private-hospital quotation or final case bill; market-regulated items require provider confirmation. |
| `hong-kong-hospital-authority-fees-and-charges-2026` | Hospital Authority Hong Kong | <https://www.ha.org.hk/visitor/fees_and_charges.asp?lang=ENG> | Hong Kong Hospital Authority public-service fee categories and charges effective from 2026 | Public charges are not Hong Kong private-sector quotations and cannot support a cross-boundary savings promise. |
| `shenzhen-government-hospital-appointment-example` | Shenzhen Municipal Government hospital information page | <https://www.sz.gov.cn/hospital/ssyy/szfybjy/content/post_9371219.html> | Appointment and visit-flow example published for Shenzhen Maternal and Child Healthcare Hospital | One hospital's process only. Always use the target provider's current appointment page. |

## Guide-to-source scope matrix

The matrix records why a link appears on a guide. It is intentionally
specific so a source cannot silently become support for a broader claim.

| Guide ID | Primary source IDs | Narrow use |
| --- | --- | --- |
| `foreigners-can-seek-care-in-china` | `eyeshenzhen-international-services-2026`; `nhc-public-health-information-search`; `shenzhen-health-commission-provider-and-physician-directory` | Named Shenzhen examples, official provider/physician search, and the need to verify each provider |
| `foreign-patient-shenzhen-preparation` | `eyeshenzhen-international-services-2026`; `shenzhen-health-commission-provider-and-physician-directory`; `shenzhen-health-commission-institution-registration-rules` | Preparation checklist and official institution-registration checks |
| `shenzhen-international-private-medical` | `shenzhen-health-commission-institution-registration-rules`; `shenzhen-health-commission-provider-and-physician-directory`; `eyeshenzhen-international-services-2026` | Registration first; named-service descriptions only; no private-care ranking |
| `overseas-chinese-returning-care` | `nhc-public-health-information-search`; `shenzhen-health-commission-provider-and-physician-directory`; `hong-kong-insurance-authority-medical-claims-guidance` | Provider search, records/coordination checklist, and insurer-document boundary |
| `hong-kong-resident-shenzhen-care` | `hk-government-cross-boundary-healthcare-2026`; `hk-government-cross-boundary-insurance-arrangements-2024`; `shenzhen-health-commission-provider-and-physician-directory`; `hong-kong-insurance-authority-medical-claims-guidance` | Specific pilots/designated institutions and individual insurer arrangements only |
| `greater-bay-area-cross-border-resources` | `hk-government-cross-boundary-healthcare-2026`; `hk-government-cross-boundary-insurance-arrangements-2024`; `nhc-public-health-information-search`; `shenzhen-health-commission-provider-and-physician-directory` | Resource-layering and pilot/designated-provider boundaries |
| `shenzhen-international-medical-services` | `eyeshenzhen-international-services-2026`; `sysu-international-center-shenzhen-2026`; `shenzhen-health-commission-provider-and-physician-directory`; `hong-kong-insurance-authority-medical-claims-guidance` | Named institution examples; SYSU statement is not city-wide; insurance remains policy-specific |
| `english-care-in-shenzhen` | `sysu-international-center-shenzhen-2026`; `eyeshenzhen-international-services-2026`; `shenzhen-health-commission-provider-and-physician-directory` | Specific bilingual statements and the need to check each communication step |
| `hong-kong-doctor-shenzhen-registration` | `nhc-hong-kong-macao-physician-short-term-practice-rule`; `shenzhen-health-commission-physician-registration`; `nhc-public-health-information-search` | Registration, practice location/category/scope and official lookup path |
| `shenzhen-hong-kong-private-cost-comparison` | `shenzhen-healthcare-security-medical-service-prices`; `hong-kong-hospital-authority-fees-and-charges-2026`; `hong-kong-insurance-authority-medical-claims-guidance` | Comparable cost categories, public-vs-private distinction, and insurer pre-authorisation |
| `international-medical-insurance-claims-china` | `hong-kong-insurance-authority-medical-claims-guidance`; `hong-kong-insurance-authority-policyholder-protection`; `hk-government-cross-boundary-insurance-arrangements-2024` | Claim preparation, insurer authorisation and individual cross-boundary arrangements |
| `international-patient-gba-appointment-travel` | `eyeshenzhen-international-services-2026`; `hk-government-cross-boundary-healthcare-2026`; `shenzhen-government-hospital-appointment-example` | Provider confirmation, designated/pilot context and one appointment-flow example |

## Deliberately blocked claims

- **Shenzhen Hyzen Hospital:** its official site could not be reliably retrieved
  during this audit. No hospital description, licence, specialty, doctor,
  Hong Kong doctor schedule, English service, ward, price, insurer or
  partnership claim is published in this GEO content contract.
- **Doctor names and schedules:** none are seeded. A physician must be checked
  through the current official registration path and the provider's own page.
- **Hospital partnerships:** none are implied by a source link. Public listing
  does not mean Phoenix Nova has a contract or referral arrangement.
- **Prices and savings:** no fixed price, percentage saving or final bill is
  published. Official catalogues are used only as a direction for checking.
- **Insurance:** no coverage, pre-authorisation or direct-billing outcome is
  promised. The insurer and policy control the result.
- **Clinical matters:** no diagnosis, treatment recommendation, triage,
  hospital acceptance, immigration/visa outcome or emergency transfer is
  provided.

## Release gate

All hub and guide descriptors currently carry `publicationStatus: "draft"`
and `indexable: false`. `lib/health-geo.ts` also keeps the Health GEO origin
behind deployment, Founder-approval and search gates. Before any public
release, re-check every URL, update `verifiedAt`, review translations and
have Founder approve the clinical-advertising and source-scope review.
