import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IdentityLandingPage from "@/app/identity/page";
import { IdentityAssessmentExperience } from "@/components/identity-assessment-experience";
import { IdentityFullAnalysisExperience } from "@/components/identity-full-analysis-experience";
import { IdentityFullReportExperience } from "@/components/identity-full-report-experience";
import { IdentityResultExperience } from "@/components/identity-result-experience";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("Identity mobile flow smoke test", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    pushMock.mockClear();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  });

  it("runs Landing → Free 6 → Snapshot → Dynamic Questions → Full Free Report → Advisor Booking", async () => {
    const landing = render(<IdentityLandingPage />);
    expect(screen.getByRole("link", { name: /开始 Free 6题/ })).toHaveAttribute("href", "/identity/assessment");
    expect(screen.queryByText(/¥39\.9/)).not.toBeInTheDocument();
    landing.unmount();

    const assessment = render(<IdentityAssessmentExperience />);
    await screen.findByRole("heading", { name: "为什么开始考虑香港身份？" });
    fireEvent.click(screen.getByRole("button", { name: /孩子教育/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /目前没有香港身份/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /25–34岁/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /本科/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /在读/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /香港进修/ }));
    fireEvent.click(screen.getByRole("button", { name: /查看免费身份快照/ }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/identity/result"));
    assessment.unmount();

    const snapshot = render(<IdentityResultExperience />);
    expect(await screen.findByRole("link", { name: /继续完整身份分析/ })).toHaveAttribute(
      "href",
      "/identity/full-analysis",
    );
    snapshot.unmount();

    pushMock.mockClear();
    const dynamic = render(<IdentityFullAnalysisExperience />);
    await screen.findByRole("heading", { name: /个动态事实项/ });
    fireEvent.click(screen.getByRole("button", { name: "生成免费完整报告" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/identity/full-report"));
    dynamic.unmount();

    const report = render(<IdentityFullReportExperience />);
    expect(await screen.findByRole("heading", { name: "六条路径概览" })).toBeInTheDocument();
    expect(screen.getByText("TTPS A/B/C")).toBeInTheDocument();
    expect(screen.getByText("Admission ≠ Student Visa ≠ IANG")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /前往预约入口/ })).toHaveAttribute(
      "href",
      "/identity/advisor-booking",
    );
    expect(screen.queryByText(/¥39\.9/)).not.toBeInTheDocument();
    report.unmount();
  });
});
