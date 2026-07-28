import { useQuery } from "@tanstack/react-query";

interface AwesomeApiResponse {
  USDBRL: {
    bid: string;
    create_date: string;
  };
}

export function useExchangeRate() {
  return useQuery({
    queryKey: ["usd-brl-rate"],
    queryFn: async () => {
      const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
      if (!res.ok) throw new Error("Failed to fetch exchange rate");
      const data = (await res.json()) as AwesomeApiResponse;
      return {
        rate: parseFloat(data.USDBRL.bid),
        date: data.USDBRL.create_date,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
