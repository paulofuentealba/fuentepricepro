// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AssetCardHeader } from "../AssetCardHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WatchlistItem } from "@/lib/watchlist";

afterEach(() => {
  cleanup();
});

const item: WatchlistItem = {
  id: "1",
  ticker: "PETR4",
  name: "Petrobras",
  type: "STOCK_BR",
  currency: "BRL",
  currentPrice: 35,
  annualDividend: 3,
  targetYield: 6,
  ceilingPrice: 50,
  safetyMargin: 10,
  quantity: 100,
  averagePrice: 30,
  paymentMonths: [],
  payoutRatio: null,
  addedAt: Date.now(),
  investingSince: Date.now(),
};

function renderHeader(props: Partial<React.ComponentProps<typeof AssetCardHeader>> = {}) {
  return render(
    <TooltipProvider>
      <AssetCardHeader
        item={item}
        onShare={vi.fn()}
        onShareInsta={vi.fn()}
        onCorporateEvent={vi.fn()}
        onRemove={vi.fn()}
        {...props}
      />
    </TooltipProvider>,
  );
}

describe("AssetCardHeader — menu ⋯ pós-migração (sem Editar / Evento Corporativo)", () => {
  it("não exibe mais os itens 'Editar' e 'Evento Corporativo' no menu, apenas Compartilhar/Compartilhar Insta/Remover", async () => {
    renderHeader();
    const trigger = screen.getByRole("button", { name: /mais op/i });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(trigger);

    expect(await screen.findByText(/compartilhar imagem|^compartilhar$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^editar$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/evento corporativo/i)).not.toBeInTheDocument();
  });

  it("continua exibindo o badge de evento pendente e disparando onCorporateEvent ao clicar nele", () => {
    const onCorporateEvent = vi.fn();
    renderHeader({
      pendingEvent: { eventId: "ev1", date: 1, type: "split", ratio: 4 },
      onCorporateEvent,
    });

    const badge = screen.getByText(/detectado|detected/i);
    fireEvent.click(badge);
    expect(onCorporateEvent).toHaveBeenCalledTimes(1);
  });

  it("não exibe o badge de evento pendente quando não há evento detectado", () => {
    renderHeader({ pendingEvent: null });
    expect(screen.queryByText(/detectado|detected/i)).not.toBeInTheDocument();
  });
});
