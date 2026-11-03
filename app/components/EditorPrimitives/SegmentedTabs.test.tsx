import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { SegmentedTabs } from "./EditorPrimitives";

function Harness() {
  const [value, setValue] = useState<"fit" | "crop" | "frame">("fit");

  return (
    <SegmentedTabs
      ariaLabel="Screen"
      items={[
        { icon: null, id: "fit", label: "Fit" },
        { icon: null, id: "crop", label: "Crop" },
        { icon: null, id: "frame", label: "Frame" },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

describe("SegmentedTabs", () => {
  it("slides one indicator to the chosen option instead of repainting tabs", () => {
    render(<Harness />);

    const list = screen.getByRole("tablist", { name: "Screen" });

    expect(list.querySelectorAll(".editor-segmented-thumb")).toHaveLength(1);
    expect(list.style.getPropertyValue("--segmented-count")).toBe("3");
    expect(list.style.getPropertyValue("--segmented-index")).toBe("0");

    fireEvent.click(screen.getByRole("tab", { name: "Frame" }));

    expect(list.style.getPropertyValue("--segmented-index")).toBe("2");
    expect(screen.getByRole("tab", { name: "Frame" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("follows the arrow keys too", () => {
    render(<Harness />);

    const list = screen.getByRole("tablist", { name: "Screen" });

    fireEvent.keyDown(list, { key: "ArrowLeft" });

    expect(list.style.getPropertyValue("--segmented-index")).toBe("2");
  });
});
