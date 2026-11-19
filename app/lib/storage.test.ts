import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "./storage";

describe("storage helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it("reads, writes and removes keys normally", () => {
    expect(writeStorageItem("k", "v")).toBe(true);
    expect(readStorageItem("k")).toBe("v");
    expect(removeStorageItem("k")).toBe(true);
    expect(readStorageItem("k")).toBeNull();
  });

  it("swallows storage errors when localStorage is blocked or full", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    expect(readStorageItem("k")).toBeNull();
    expect(writeStorageItem("k", "v")).toBe(false);
    expect(removeStorageItem("k")).toBe(false);
  });
});
