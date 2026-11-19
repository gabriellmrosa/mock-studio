import {
  UNDO_LIMIT,
  createUndoHistory,
  getUndoShortcut,
  isTextEditingTarget,
  recordUndo,
  redoStep,
  undoStep,
} from "./undo-history";

const key = (key: string, mods: Partial<Record<"altKey" | "ctrlKey" | "metaKey" | "shiftKey", boolean>> = {}) => ({
  altKey: false,
  ctrlKey: false,
  key,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

describe("undo history", () => {
  it("goes back and forth through the changes", () => {
    let history = recordUndo(recordUndo(createUndoHistory<string>(), "a"), "b");
    // Agora a cena é "c": desfazer volta a "b", depois a "a".
    const first = undoStep(history, "c")!;

    expect(first.state).toBe("b");
    history = first.history;

    const second = undoStep(history, "b")!;

    expect(second.state).toBe("a");
    expect(undoStep(second.history, "a")).toBeNull();

    const again = redoStep(second.history, "a")!;

    expect(again.state).toBe("b");
    expect(redoStep(again.history, "b")!.state).toBe("c");
  });

  it("forgets what was undone once something new is done", () => {
    const undone = undoStep(recordUndo(createUndoHistory<string>(), "a"), "b")!;
    const changed = recordUndo(undone.history, "a");

    expect(redoStep(changed, "x")).toBeNull();
  });

  it("keeps only the last actions", () => {
    let history = createUndoHistory<number>();

    for (let index = 0; index < UNDO_LIMIT + 20; index += 1) {
      history = recordUndo(history, index);
    }

    expect(history.past).toHaveLength(UNDO_LIMIT);
    expect(history.past[0]).toBe(20);
  });

  it("reads the shortcuts of Mac and Windows", () => {
    expect(getUndoShortcut(key("z", { metaKey: true }))).toBe("undo");
    expect(getUndoShortcut(key("z", { ctrlKey: true }))).toBe("undo");
    expect(getUndoShortcut(key("Z", { metaKey: true, shiftKey: true }))).toBe("redo");
    expect(getUndoShortcut(key("Z", { ctrlKey: true, shiftKey: true }))).toBe("redo");
    expect(getUndoShortcut(key("y", { ctrlKey: true }))).toBe("redo");
    expect(getUndoShortcut(key("z"))).toBeNull();
    expect(getUndoShortcut(key("z", { altKey: true, metaKey: true }))).toBeNull();
    expect(getUndoShortcut(key("y", { metaKey: true }))).toBeNull();
  });
});

describe("text fields keep their own undo", () => {
  it("tells a text field apart from a slider or a color", () => {
    const make = (html: string) => {
      document.body.innerHTML = html;
      return document.body.firstElementChild;
    };

    expect(isTextEditingTarget(make('<input type="text" />'))).toBe(true);
    expect(isTextEditingTarget(make("<input />"))).toBe(true);
    expect(isTextEditingTarget(make("<textarea></textarea>"))).toBe(true);
    expect(isTextEditingTarget(make('<input type="range" />'))).toBe(false);
    expect(isTextEditingTarget(make('<input type="color" />'))).toBe(false);
    expect(isTextEditingTarget(make("<button></button>"))).toBe(false);
  });
});
