// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { TransactionFormFields } from "../TransactionFormFields";
import type { WatchlistItem } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";

afterEach(() => {
  cleanup();
});

const item: WatchlistItem = {
  id: "1",
  ticker: "TEST4",
  name: "Test Asset",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 10,
  annualDividend: 0,
  targetYield: 6,
  ceilingPrice: 12,
  safetyMargin: 0,
  quantity: 0,
  averagePrice: null,
  paymentMonths: [],
  payoutRatio: null,
  addedAt: Date.now(),
  investingSince: Date.now(),
};

function fillForm(quantity: string, price: string) {
  fireEvent.change(document.getElementById("tx-qty")!, { target: { value: quantity } });
  fireEvent.change(document.getElementById("tx-price")!, { target: { value: price } });
}

describe("TransactionFormFields — proteção contra duplicata", () => {
  it("bloqueia um segundo submit síncrono enquanto o primeiro ainda está salvando (duplo-clique)", async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <TransactionFormFields item={item} onSave={onSave} existingTransactions={[]} />,
    );

    fillForm("10", "10");

    const form = document.querySelector("form")!;
    // Dois submits síncronos em sequência, simulando o duplo-clique.
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    resolveSave();
    await waitFor(() => expect(screen.getByRole("button", { name: /salvar/i })).not.toBeDisabled());
  });

  it("mostra o aviso de possível duplicata e não salva sem confirmação", async () => {
    const existing: Transaction = {
      id: "existing-1",
      ticker: "TEST4",
      type: "buy",
      // Matches the form's default date (today), so the duplicate check
      // (same day, not exact timestamp) actually triggers.
      date: Date.now(),
      quantity: 10,
      pricePerShare: 10,
      fees: null,
    };
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TransactionFormFields item={item} onSave={onSave} existingTransactions={[existing]} />,
    );

    fillForm("10", "10");
    fireEvent.submit(document.querySelector("form")!);

    expect(await screen.findByText(/possível transação duplicada/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i, hidden: true }));
    await waitFor(() =>
      expect(screen.queryByText(/possível transação duplicada/i)).not.toBeInTheDocument(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("salva normalmente ao confirmar no aviso de duplicata", async () => {
    const existing: Transaction = {
      id: "existing-1",
      ticker: "TEST4",
      type: "buy",
      // Matches the form's default date (today), so the duplicate check
      // (same day, not exact timestamp) actually triggers.
      date: Date.now(),
      quantity: 10,
      pricePerShare: 10,
      fees: null,
    };
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TransactionFormFields item={item} onSave={onSave} existingTransactions={[existing]} />,
    );

    fillForm("10", "10");
    fireEvent.submit(document.querySelector("form")!);

    await screen.findByText(/possível transação duplicada/i);
    fireEvent.click(screen.getByRole("button", { name: /salvar mesmo assim/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  it("salva direto, sem aviso, quando os valores não colidem com nenhuma transação existente", async () => {
    const existing: Transaction = {
      id: "existing-1",
      ticker: "TEST4",
      type: "buy",
      // Matches the form's default date (today), so the duplicate check
      // (same day, not exact timestamp) actually triggers.
      date: Date.now(),
      quantity: 5,
      pricePerShare: 20,
      fees: null,
    };
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TransactionFormFields item={item} onSave={onSave} existingTransactions={[existing]} />,
    );

    fillForm("10", "10");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/possível transação duplicada/i)).not.toBeInTheDocument();
  });
});
