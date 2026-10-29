# Health dual-goal entry V1.1

Founder steering: PHOENIX-HEALTH-FAMILY-ENTRY-V1 plus Health 双目标模式 V1.1, received during the Health landing task. Same branch and fixed main baseline. This document supersedes any earlier statement that the Health questionnaire UI file is entirely unchanged: one optional result-stage navigation aside was added. Question text, options, model/rules, state lifecycle, export, consent and the server gate remain unchanged.

## Visitor routes

| Entry on /[locale]/health | Destination | Assessment required? |
| --- | --- | --- |
| 家庭健康规划 / Family health planning | /[locale]/health/family | No |
| 国际医疗服务 / International medical services | #services, then optional #consultation | No |
| 两者兼顾 / Both, together | /[locale]/health/family#integrated-support | No |

The family page contains its own hero, six planning directions, the existing 14-question Compass introduction, audiences, international service bridge and independent #family-consultation preparation demo. It reuses canonical `dimensions` titles/actions from lib/health-compass.ts, without changing or inventing questions or decision rules.

All assessment links on both pages point to the same existing /zh/compass/health or /en/compass/health, only when the original server switch allows them. When off, family assessment buttons are disabled with visible explanatory text; service browsing and both consultation demos remain available. There is no goal-specific questionnaire copy, query-string answer transfer or persisted goal selector.

## Results and voluntary consultation

The original questionnaire's result stage has an optional, static navigation aside linking to family planning consultation preparation or international care consultation preparation. Links contain only fixed locale paths and anchors. They do not attach answers, results, action selections, medical data or tracking parameters, and use ordinary anchors without prefetch. The aside explains that leaving clears the current session.

Consultation demos use separate page-local React state. The family demo selects a generic planning direction; the international demo selects a generic coordination service. Neither reads questionnaire state, collects personal details, makes requests, stores anything or claims an enquiry was sent. Refresh resets each demo. No real advisor or appointment endpoint is connected.

## Boundaries

One assessment, two service values, independent voluntary consultation. Canonical customer/family/service data remains with Phoenix Core; no new master registry, database, authentication, CRM, Family OS, production configuration or sensitive medical ingestion is introduced. HEALTH remains RESERVED in existing Core handoff contracts. See HEALTH_LANDING_V1.md for future interface design and HEALTH_LANDING_DELIVERY.md for executed validation and outstanding gates.
