# Aoyu Asset Guide

This package is prepared for the existing ASKWISE project.

## Runtime folders
- `public/assets/aoyu/turnaround/` — front/side/back/top reference views
- `public/assets/aoyu/expressions/` — facial/emotional states
- `public/assets/aoyu/poses/` — learning-flow states
- `public/assets/aoyu/hero/` — default hero image
- `public/assets/aoyu/animation/` — reserved for future Lottie/GIF/APNG

## Code mapping
Use `src/config/aoyu.ts` instead of hard-coding image paths throughout the app.

Examples:
- `AOYU_ASSETS.expressions.thinking`
- `AOYU_ASSETS.poses.guiding`
- `AOYU_ASSETS.hero`

## Brand rule
These files are derived from the approved Aoyu character sheet. Do not redraw, restyle, recolor, or change facial/body proportions without a new approved master.

## Suggested UI mapping
- Home/default → `poses.idle`
- Student speaking / input → `expressions.listening` or `poses.listening`
- AI diagnosis / processing → `poses.thinking`
- Hint / scaffold → `poses.guiding`
- Positive reinforcement → `poses.encouraging`
- Task completed → `poses.celebrating`
- Reflection → `poses.reflecting`
- Inactive / end of session → `poses.rest`
