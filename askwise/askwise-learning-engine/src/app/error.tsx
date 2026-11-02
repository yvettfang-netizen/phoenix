"use client";
import AoyuCompanion from "@/components/aoyu/aoyu-companion";

export default function PilotError({ reset }: { reset: () => void }) {
  return <section><AoyuCompanion state="safe_error" message="The request could not be completed. Your saved work is kept. If a submission is uncertain, check its record before submitting again." />
    <button onClick={reset}>Try loading again</button></section>;
}
