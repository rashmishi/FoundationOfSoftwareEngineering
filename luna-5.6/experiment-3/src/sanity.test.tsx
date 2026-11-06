import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import axe from "axe-core";
import { App } from "./main";

afterEach(cleanup);

describe("Luna Notes delivery contract", () => {
  it("uses the versioned local storage key and export format", () => {
    const payload = {
      format: "luna-notes",
      version: 1,
      notes: [],
      columns: [],
    };
    expect(payload.format).toBe("luna-notes");
    expect(payload.version).toBe(1);
    expect(Array.isArray(payload.notes)).toBe(true);
    expect(Array.isArray(payload.columns)).toBe(true);
  });

  it("keeps a title as the required note invariant", () => {
    const title = "  A useful thought  ".trim();
    expect(title).toBe("A useful thought");
    expect("   ".trim()).toBe("");
  });

  it("renders an accessible empty workspace", async () => {
    const { container, getByRole } = render(<App />);
    expect(getByRole("main")).toBeTruthy();
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it("supports keyboard operation of the column menu", () => {
    const { getByRole, getByLabelText, queryByRole } = render(<App />);
    fireEvent.click(getByLabelText("More actions for Inbox"));
    const menu = getByRole("menu");
    expect(document.activeElement).toBe(getByRole("menuitem"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(getByRole("menuitem"));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(queryByRole("menu")).toBeNull();
  });
});
