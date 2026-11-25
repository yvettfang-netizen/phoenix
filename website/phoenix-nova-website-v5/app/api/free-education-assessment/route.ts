import { env } from "cloudflare:workers";
import { freeAssessmentPreviewEnabled, handleFreeEducationAssessment } from "@/lib/free-education-assessment";

export async function POST(request: Request) {
  return handleFreeEducationAssessment(request, freeAssessmentPreviewEnabled(env as Record<string, unknown>));
}
