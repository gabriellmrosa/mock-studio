import { fireEvent, render, screen } from "@testing-library/react";
import AnalyticsConsent from "./AnalyticsConsent";
import { startAnalytics } from "../../lib/analytics";
import { APP_COPY } from "../../lib/i18n";

jest.mock("../../lib/analytics", () => ({
  ...jest.requireActual("../../lib/analytics"),
  startAnalytics: jest.fn(),
}));

const copy = APP_COPY["en-US"];
const CONSENT_KEY = "mock-photo-analytics-consent";

describe("AnalyticsConsent", () => {
  const originalEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = originalEnv;
  });

  it("asks on the first visit and starts nothing meanwhile", () => {
    render(<AnalyticsConsent copy={copy} />);

    expect(
      screen.getByRole("region", { name: copy.analyticsConsentTitle }),
    ).toBeInTheDocument();
    expect(startAnalytics).not.toHaveBeenCalled();
  });

  it("starts analytics only after Accept, and remembers it", () => {
    render(<AnalyticsConsent copy={copy} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(startAnalytics).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("granted");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("never starts after Decline, and remembers it", () => {
    render(<AnalyticsConsent copy={copy} />);

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(startAnalytics).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("denied");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("starts on its own when the visitor already accepted", () => {
    window.localStorage.setItem(CONSENT_KEY, "granted");
    render(<AnalyticsConsent copy={copy} />);

    expect(screen.queryByRole("region")).toBeNull();
    expect(startAnalytics).toHaveBeenCalledTimes(1);
  });

  it("asks nothing again after a Decline", () => {
    window.localStorage.setItem(CONSENT_KEY, "denied");
    render(<AnalyticsConsent copy={copy} />);

    expect(screen.queryByRole("region")).toBeNull();
    expect(startAnalytics).not.toHaveBeenCalled();
  });

  it("stays out of localhost and previews", () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
    render(<AnalyticsConsent copy={copy} />);

    expect(screen.queryByRole("region")).toBeNull();
    expect(startAnalytics).not.toHaveBeenCalled();
  });
});
