import { fireEvent, render, screen } from "@testing-library/react";
import NumberField from "./NumberField";

function setup(props: Partial<React.ComponentProps<typeof NumberField>> = {}) {
  const onChange = jest.fn();

  render(
    <NumberField
      ariaLabel="Size"
      icon={<span>i</span>}
      max={600}
      min={8}
      value={64}
      onChange={onChange}
      {...props}
    />,
  );

  return { input: screen.getByLabelText("Size") as HTMLInputElement, onChange };
}

describe("NumberField", () => {
  it("shows the value and commits what was typed on blur", () => {
    const { input, onChange } = setup();

    expect(input.value).toBe("64");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "120" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(120);
  });

  it("commits on Enter and drops the change on Escape", () => {
    const { input, onChange } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(90);

    onChange.mockClear();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "300" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("64");
  });

  it("keeps the value inside its limits", () => {
    const { input, onChange } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "99999" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(600);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(8);
  });

  it("accepts a comma as the decimal separator", () => {
    const { input, onChange } = setup({ min: 0.8, max: 3, step: 0.05, value: 1.2 });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1,5" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it("ignores what is not a number", () => {
    const { input, onChange } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("64");
  });

  it("steps with the arrows, ten at a time with Shift", () => {
    const { input, onChange } = setup({ step: 2 });

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(66);

    // O passo seguinte parte do que o campo mostra agora (66), não do valor antigo.
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(46);
  });

  it("shows a stored fraction as a percentage and stores it back as a fraction", () => {
    const { input, onChange } = setup({
      max: 0.5,
      min: -0.1,
      scale: 100,
      step: 0.01,
      suffix: "%",
      value: 0.05,
    });

    expect(input.value).toBe("5");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(0.12);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(0.06);
  });

  it("treats an empty field as a value when it has an empty label", () => {
    const { input, onChange } = setup({ emptyLabel: "Auto", value: 400 });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows the empty label while the value is null, and never empties a field without one", () => {
    const { input } = setup({ emptyLabel: "Auto", value: null });

    expect(input.value).toBe("");
    expect(input).toHaveAttribute("placeholder", "Auto");
  });

  it("does not turn an empty field into null when there is no empty label", () => {
    const { input, onChange } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });
});
