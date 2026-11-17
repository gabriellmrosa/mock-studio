import { fireEvent, render, screen } from "@testing-library/react";
import ContextMenu from "./ContextMenu";

function renderMenu(onNews = jest.fn()) {
  render(
    <ContextMenu
      items={[
        {
          type: "submenu",
          label: "Language",
          options: [
            { label: "PT-BR", value: "pt-BR", checked: true, onClick: jest.fn() },
            { label: "EN-US", value: "en-US", onClick: jest.fn() },
          ],
        },
        { type: "action", label: "What's new", onClick: onNews },
      ]}
      triggerAriaLabel="Preferences"
      triggerTitle="Preferences"
      triggerIcon={<span>⋮</span>}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Preferences" }));

  return onNews;
}

describe("ContextMenu with a submenu next to a plain item", () => {
  it("opens the submenu when the pointer is on its row", () => {
    renderMenu();

    expect(screen.queryByRole("button", { name: "PT-BR" })).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Language" }));

    expect(screen.getByRole("button", { name: "PT-BR" })).toBeInTheDocument();
  });

  it("closes the submenu when the pointer moves to the plain item below it", () => {
    renderMenu();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Language" }));
    fireEvent.mouseEnter(screen.getByRole("button", { name: "What's new" }));

    expect(screen.queryByRole("button", { name: "PT-BR" })).not.toBeInTheDocument();
  });

  it("closes it when the plain item gets the keyboard focus", () => {
    renderMenu();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Language" }));
    fireEvent.focus(screen.getByRole("button", { name: "What's new" }));

    expect(screen.queryByRole("button", { name: "PT-BR" })).not.toBeInTheDocument();
  });

  it("keeps the plain item working", () => {
    const onNews = renderMenu();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Language" }));
    fireEvent.click(screen.getByRole("button", { name: "What's new" }));

    expect(onNews).toHaveBeenCalledTimes(1);
  });
});
