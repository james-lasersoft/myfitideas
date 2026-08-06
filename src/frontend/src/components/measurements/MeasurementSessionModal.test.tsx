import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleContext";
import MeasurementSessionModal from "./MeasurementSessionModal";

function ModalHarness({ onSave }: { onSave: () => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setIsOpen(true)}>Start measurement session</button>
    <MeasurementSessionModal
      isOpen={isOpen}
      lengthUnit="in"
      onCancel={() => setIsOpen(false)}
      onSave={onSave}
    />
  </>;
}

beforeEach(() => {
  localStorage.setItem("myfitideas.locale", "en-US");
});

describe("MeasurementSessionModal", () => {
  it("moves Enter through paired fields and then advances without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<LocaleProvider><ModalHarness onSave={onSave} /></LocaleProvider>);

    await user.click(screen.getByRole("button", { name: "Start measurement session" }));
    for (let step = 0; step < 5; step += 1) {
      await user.click(screen.getByRole("button", { name: "Skip" }));
    }

    const leftInput = screen.getByRole("spinbutton", { name: "Left upper arm in" });
    const rightInput = screen.getByRole("spinbutton", { name: "Right upper arm in" });
    await user.type(leftInput, "12");
    await user.keyboard("{Enter}");
    expect(rightInput).toHaveFocus();

    await user.type(rightInput, "12.5");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: "Forearms" })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels on Escape and restores focus to the session launcher", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<LocaleProvider><ModalHarness onSave={onSave} /></LocaleProvider>);

    const launcher = screen.getByRole("button", { name: "Start measurement session" });
    await user.click(launcher);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(launcher).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });
});
