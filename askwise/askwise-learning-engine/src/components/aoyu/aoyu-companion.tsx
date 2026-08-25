import { AOYU_ASSETS } from "@/config/aoyu";

type AoyuState = "idle" | "listening" | "thinking" | "guiding" | "encouraging" | "celebrating" | "reflecting";

const AOYU_LABEL: Record<AoyuState, string> = {
  idle: "Aoyu is ready",
  listening: "Aoyu is listening",
  thinking: "Aoyu is checking the reasoning",
  guiding: "Aoyu is guiding",
  encouraging: "Aoyu is encouraging",
  celebrating: "Aoyu is celebrating",
  reflecting: "Aoyu is reflecting",
};

type Props = {
  state: AoyuState;
  message?: string;
};

export default function AoyuCompanion({ state, message }: Props) {
  const imageSrc = AOYU_ASSETS.poses[state] ?? AOYU_ASSETS.expressions.default;

  return (
    <section className={`aoyu-shell aoyu-${state}`}>
      <img className="aoyu-avatar" src={imageSrc} alt={AOYU_LABEL[state]} />
      <p className="aoyu-title">{AOYU_LABEL[state]}</p>
      {message ? <p className="aoyu-message">{message}</p> : null}
    </section>
  );
}
