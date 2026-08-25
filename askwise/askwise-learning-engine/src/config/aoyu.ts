export const AOYU_ASSETS = {
  hero: "/assets/aoyu/hero/default.png",

  turnaround: {
    front: "/assets/aoyu/turnaround/front.png",
    side: "/assets/aoyu/turnaround/side.png",
    back: "/assets/aoyu/turnaround/back.png",
    top: "/assets/aoyu/turnaround/top.png",
  },

  expressions: {
    default: "/assets/aoyu/expressions/default.png",
    listening: "/assets/aoyu/expressions/listening.png",
    thinking: "/assets/aoyu/expressions/thinking.png",
    smile: "/assets/aoyu/expressions/smile.png",
    encouraging: "/assets/aoyu/expressions/encouraging.png",
    excited: "/assets/aoyu/expressions/excited.png",
  },

  poses: {
    idle: "/assets/aoyu/poses/idle.png",
    listening: "/assets/aoyu/poses/listening.png",
    thinking: "/assets/aoyu/poses/thinking.png",
    guiding: "/assets/aoyu/poses/guiding.png",
    encouraging: "/assets/aoyu/poses/encouraging.png",
    celebrating: "/assets/aoyu/poses/celebrating.png",
    reflecting: "/assets/aoyu/poses/reflecting.png",
    rest: "/assets/aoyu/poses/rest.png",
  },
} as const;

export type AoyuExpression = keyof typeof AOYU_ASSETS.expressions;
export type AoyuPose = keyof typeof AOYU_ASSETS.poses;
