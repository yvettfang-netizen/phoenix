# Phoenix Family OS™ MVP Acceptance Test Plan V1.0

Use only a controlled non-production AppID and fictional family data. Record tool/base-library/device versions, commit SHA, tester, time, result, logs and screenshots. Do not upload or submit for review.

## DEV-01 through DEV-06

1. Import the exact Family OS directory and confirm AppID type without exposing secrets.
2. Clear isolated simulator cache and compile; record all errors/warnings.
3. Compile again and verify local Demo state behavior.
4. Smoke all family routes, return behavior, tab navigation and refresh.
5. Inspect Console/Storage for errors, credential exposure and unintended real data.
6. Observe startup/navigation performance without claiming a formal performance pass.

## Family flow

```text
Demo login
→ Family Profile
→ Child Profile
→ Education Compass
→ 成长洞察
→ Family Timeline
→ Advisor Service request
```

Verify invalid input, missing/expired local session, duplicate submit, backend unavailable/retry, storage failure, refresh and repeated entry.

## Device matrix

- simulator widths: 375, 390, 393 and 430 px
- one iPhone covering notch/Dynamic Island and Home Indicator
- two Android devices/configurations covering different status/navigation modes
- status bar, capsule, bottom navigation, fixed buttons, keyboard, scrolling and horizontal overflow

## Brand and scope

- use existing repository assets only; official source/sign-off is a separate blocker
- normal family navigation must not expose Advisor/Admin or Partner preview
- customer UI says `成长洞察`; it must not claim real AI chat
- no real family data, production API, payment, or unimplemented feature

Any unexecuted item is BLOCKED or NOT RUN, never PASS.
