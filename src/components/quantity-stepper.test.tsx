/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/renderWithIntl";
import QuantityStepper from "@/components/quantity-stepper";

// Controls how many of something a customer buys, and clamps against the
// stock cap the shop passes in — worth pinning because the clamping is the
// only thing between a typed-in number and an order for more than exists.

afterEach(cleanup);

const decrease = () => screen.getByRole("button", { name: /snížit|ubrat|méně|decrease/i });
const increase = () => screen.getByRole("button", { name: /zvýšit|přidat|více|increase/i });
const field = () => screen.getByRole("spinbutton") as HTMLInputElement;

describe("QuantityStepper", () => {
  it("steps up and down by one", async () => {
    const onChange = vi.fn();
    renderWithIntl(<QuantityStepper value={2} onChange={onChange} max={10} />);

    await userEvent.click(increase());
    expect(onChange).toHaveBeenLastCalledWith(3);

    await userEvent.click(decrease());
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("disables the controls at each end rather than emitting out-of-range values", async () => {
    const onChange = vi.fn();
    const { unmount } = renderWithIntl(<QuantityStepper value={1} onChange={onChange} max={3} />);
    expect((decrease() as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(decrease());
    expect(onChange).not.toHaveBeenCalled();
    unmount();

    renderWithIntl(<QuantityStepper value={3} onChange={onChange} max={3} />);
    expect((increase() as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(increase());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps a typed value to the stock cap", async () => {
    // The cap is what's actually in stock — typing past it must not reach
    // checkout as an order the shop can't fulfil.
    const onChange = vi.fn();
    renderWithIntl(<QuantityStepper value={1} onChange={onChange} max={5} />);

    await userEvent.type(field(), "9");
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it("falls back to the minimum when the field is cleared", async () => {
    const onChange = vi.fn();
    renderWithIntl(<QuantityStepper value={4} onChange={onChange} max={9} />);

    await userEvent.clear(field());
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("honours a custom minimum", async () => {
    const onChange = vi.fn();
    renderWithIntl(<QuantityStepper value={2} onChange={onChange} min={2} max={9} />);

    await userEvent.click(decrease());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows unbounded increase when no max is given", async () => {
    const onChange = vi.fn();
    renderWithIntl(<QuantityStepper value={999} onChange={onChange} />);

    await userEvent.click(increase());
    expect(onChange).toHaveBeenLastCalledWith(1000);
  });
});
