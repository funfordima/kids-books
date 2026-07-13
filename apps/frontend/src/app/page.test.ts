import { describe, expect, it } from "vitest";
import RootLayout from "./layout";
import HomePage from "./page";

describe("frontend scaffold", () => {
  it("renders the shared contract from the App Router page", () => {
    const page = HomePage();

    expect(page.type).toBe("main");
    expect(JSON.stringify(page.props.children)).toContain("0.1.0");
  });

  it("wraps page content in the root document layout", () => {
    const child = HomePage();
    const layout = RootLayout({ children: child });

    expect(layout.type).toBe("html");
    expect(layout.props.lang).toBe("en");
  });
});
