import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "./auth-provider";

export type IssuerTickerMappings = Record<string, string>;

const STORAGE_KEY = "ceilingPricePro.issuerTickerMappings.v1";

function readLocalMappings(): IssuerTickerMappings {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalMappings(mappings: IssuerTickerMappings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch (e) {
    console.error("Failed to save local issuer ticker mappings", e);
  }
}

export function useIssuerTickerMappings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? null;

  const queryKey = ["issuerTickerMappings", userId];

  const { data: mappings = {}, isPending } = useQuery<IssuerTickerMappings>({
    queryKey,
    queryFn: async () => {
      if (userId) {
        try {
          const ref = doc(db, "users", userId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            const cloudMappings = data.issuerTickerMappings;
            if (cloudMappings && typeof cloudMappings === "object") {
              return cloudMappings as IssuerTickerMappings;
            }
          }
          // First time cloud user: if local mappings exist, sync to cloud
          const local = readLocalMappings();
          if (Object.keys(local).length > 0) {
            await setDoc(ref, { issuerTickerMappings: local }, { merge: true });
          }
          return local;
        } catch (e) {
          console.error("Failed to read cloud issuer ticker mappings", e);
          return readLocalMappings();
        }
      } else {
        return readLocalMappings();
      }
    },
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: async (newEntries: IssuerTickerMappings) => {
      const merged: IssuerTickerMappings = {
        ...mappings,
        ...newEntries,
      };

      if (userId) {
        const ref = doc(db, "users", userId);
        await setDoc(ref, { issuerTickerMappings: merged }, { merge: true });
      } else {
        writeLocalMappings(merged);
      }
      return merged;
    },
    onMutate: async (newEntries) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<IssuerTickerMappings>(queryKey) || {};
      const next: IssuerTickerMappings = { ...prev, ...newEntries };
      queryClient.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const saveMappings = (newEntries: IssuerTickerMappings) => saveMutation.mutateAsync(newEntries);

  return { mappings, saveMappings, isPending };
}
