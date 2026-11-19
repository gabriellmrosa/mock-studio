import { render } from "@testing-library/react";
import PwaRegistration from "./PwaRegistration";

describe("PwaRegistration", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalServiceWorker = navigator.serviceWorker;
  const originalReadyState = Object.getOwnPropertyDescriptor(
    document,
    "readyState",
  );

  function setReadyState(value: DocumentReadyState) {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value,
    });
  }

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      value: originalEnv,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
    if (originalReadyState) {
      Object.defineProperty(document, "readyState", originalReadyState);
    } else {
      delete (document as { readyState?: DocumentReadyState }).readyState;
    }
  });

  it("registers immediately in production when the document is already complete", () => {
    const register = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      value: "production",
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    setReadyState("complete");

    render(<PwaRegistration />);

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("waits for window load when the document is still loading and cleans up on unmount", () => {
    const register = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      value: "production",
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    setReadyState("loading");

    const { unmount } = render(<PwaRegistration />);
    expect(register).not.toHaveBeenCalled();

    unmount();
    window.dispatchEvent(new Event("load"));
    expect(register).not.toHaveBeenCalled();
  });
});
