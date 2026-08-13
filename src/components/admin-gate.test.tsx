/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/renderWithIntl";
import AdminGate from "@/components/admin-gate";

// This decides whether admin content renders at all, so the three states are
// worth pinning down. It is not the security boundary — every admin API route
// checks the session server-side via withAdmin — but a regression here would
// either expose the admin UI shell or lock a logged-in admin out of it.

type Auth = Parameters<typeof AdminGate>[0]["auth"];

const auth = (over: Partial<Auth>): Auth =>
  ({
    loggedIn: false,
    checking: false,
    recheck: vi.fn(),
    logout: vi.fn(),
    ...over,
  }) as Auth;

afterEach(cleanup);

describe("AdminGate", () => {
  it("renders nothing while the session check is in flight", () => {
    // Deliberately blank rather than a spinner: the check resolves against a
    // cookie in a few ms, and a flash of loading reads worse than a beat of
    // nothing. It must not show the login form in the meantime.
    const { container } = renderWithIntl(
      <AdminGate auth={auth({ checking: true })}>
        <p>secret</p>
      </AdminGate>
    );
    expect(container.innerHTML).toBe("");
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("shows the login form, not the content, when signed out", () => {
    renderWithIntl(
      <AdminGate auth={auth({ loggedIn: false })}>
        <p>secret</p>
      </AdminGate>
    );
    expect(screen.queryByText("secret")).toBeNull();
    // Copy comes from the real cs.json, so this also fails if the key goes away.
    expect(screen.getByRole("button", { name: /přihlásit/i })).toBeTruthy();
  });

  it("renders the content once signed in", () => {
    renderWithIntl(
      <AdminGate auth={auth({ loggedIn: true })}>
        <p>secret</p>
      </AdminGate>
    );
    expect(screen.getByText("secret")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /přihlásit/i })).toBeNull();
  });

  it("still gates on loggedIn while checking is true", () => {
    // checking wins over loggedIn — otherwise a stale `true` from a previous
    // session would flash protected content during a re-check.
    const { container } = renderWithIntl(
      <AdminGate auth={auth({ loggedIn: true, checking: true })}>
        <p>secret</p>
      </AdminGate>
    );
    expect(container.innerHTML).toBe("");
  });
});
