import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n/LocaleContext";
import MeasurementSessionModal from "./MeasurementSessionModal";

function ModalHarness({ onSave, entryMode = "NEWBIE" }: { onSave: () => Promise<void>; entryMode?: "NEWBIE" | "PRO" }) {
  const [isOpen, setIsOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setIsOpen(true)}>Start measurement session</button>
    <MeasurementSessionModal
      isOpen={isOpen}
      entryMode={entryMode}
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
  it("omits entry mode chrome and opens Guided directly in the wizard", async () => {
    const user = userEvent.setup();
    render(<LocaleProvider><ModalHarness onSave={vi.fn(async () => undefined)} /></LocaleProvider>);

    await user.click(screen.getByRole("button", { name: "Start measurement session" }));

    const dialog = screen.getByRole("dialog", { name: "Body measurement session" });
    expect(within(dialog).queryByText("Entry mode")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Novice")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Standard")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Advanced")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Neck" })).toBeInTheDocument();
    expect(within(dialog).getByRole("img", {
      name: "Illustration showing tape placement around the neck.",
    })).toHaveAttribute("src", expect.stringMatching(/data-measurement-concept=.*neck/));
    await waitFor(() => expect(within(dialog).getByRole("spinbutton", { name: "Neck in" })).toHaveFocus());
    expect(within(dialog).getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("opens Manual directly in the full editable measurement interface", async () => {
    const user = userEvent.setup();
    render(<LocaleProvider><ModalHarness entryMode="PRO" onSave={vi.fn(async () => undefined)} /></LocaleProvider>);

    await user.click(screen.getByRole("button", { name: "Start measurement session" }));

    const dialog = screen.getByRole("dialog", { name: "Body measurement session" });
    expect(within(dialog).queryByText("Entry mode")).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("spinbutton")).toHaveLength(13);
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: "Neck in" })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: "Right calf in" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save session" })).toBeInTheDocument();
  });

  it("moves Enter through paired fields and then advances without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<LocaleProvider><ModalHarness onSave={onSave} /></LocaleProvider>);

    await user.click(screen.getByRole("button", { name: "Start measurement session" }));
    for (let step = 0; step < 5; step += 1) {
      await user.click(screen.getByRole("button", { name: "Skip" }));
    }

    const pairImage = screen.getByRole("img", {
      name: "Illustration showing tape placement around the upper arm.",
    });
    expect(pairImage).toHaveAttribute("src", expect.stringMatching(/data-measurement-concept=.*upper-arm/));
    expect(screen.getAllByRole("img")).toHaveLength(1);
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

  it("keeps the compact review free of guidance illustrations and does not save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<LocaleProvider><ModalHarness onSave={onSave} /></LocaleProvider>);

    await user.click(screen.getByRole("button", { name: "Start measurement session" }));
    for (let step = 0; step < 9; step += 1) {
      await user.click(screen.getByRole("button", { name: "Skip" }));
    }

    const dialog = screen.getByRole("dialog", { name: "Body measurement session" });
    expect(within(dialog).getByRole("heading", { name: "Review your measurements" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save session" })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels on Escape and restores focus to the session launcher", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<LocaleProvider><ModalHarness onSave={onSave} /></LocaleProvider>);

    const launcher = screen.getByRole("button", { name: "Start measurement session" });
    await user.click(launcher);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("measurement-modal");
    expect(dialog.parentElement).toHaveClass("measurement-modal-backdrop");
    expect(screen.getByRole("button", { name: "Close measurement session" })).toHaveClass("measurement-modal-close");
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(launcher).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps concise guidance in keyboard-accessible disclosures without repeating instructions", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<LocaleProvider><ModalHarness onSave={onSave} /></LocaleProvider>);

    await user.click(screen.getByRole("button", { name: "Start measurement session" }));

    const keyboardSummary = screen.getByText("Keyboard help");
    const keyboardDetails = keyboardSummary.closest("details") as HTMLDetailsElement;
    expect(keyboardDetails.open).toBe(false);
    expect(screen.getAllByText("Press Enter to continue. For paired measurements, Enter moves from left to right.")).toHaveLength(1);
    keyboardSummary.focus();
    expect(keyboardSummary).toHaveFocus();
    await user.click(keyboardSummary);
    expect(keyboardDetails.open).toBe(true);

    const techniqueSummary = screen.getByText("Technique");
    const techniqueDetails = techniqueSummary.closest("details") as HTMLDetailsElement;
    expect(techniqueDetails.open).toBe(false);
    techniqueSummary.focus();
    expect(techniqueSummary).toHaveFocus();
    await user.click(techniqueSummary);
    expect(techniqueDetails.open).toBe(true);
    expect(screen.getByText("Place the tape below the larynx, level and snug without compressing the skin.")).toBeInTheDocument();
    expect(screen.queryByText("Place the tape just below the larynx. Keep it level and comfortably snug without compressing the skin.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByText("Press Enter to continue. For paired measurements, Enter moves from left to right.")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Chest" })).toBeInTheDocument();
  });

});
