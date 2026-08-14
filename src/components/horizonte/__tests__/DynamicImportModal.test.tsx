// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DynamicImportModal } from "../DynamicImportModal";
import { I18nProvider } from "@/lib/i18n-provider";

describe("DynamicImportModal (Prompt 104)", () => {
  it("renders dropzone in idle state when opened", () => {
    render(
      <I18nProvider>
        <DynamicImportModal open={true} onOpenChange={vi.fn()} />
      </I18nProvider>,
    );

    expect(
      screen.getByText(/Importação Inteligente de Transações|Smart Transaction Import/i),
    ).toBeDefined();
    expect(
      screen.getByText(/Arraste e solte seu arquivo aqui|Drag and drop your file here/i),
    ).toBeDefined();
  });
});
