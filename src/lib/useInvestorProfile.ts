import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "./auth-provider";
import { DEFAULT_INVESTOR_PROFILE, type InvestorProfile } from "./investor-profile";

const STORAGE_KEY = "ceilingPricePro.investorProfile.v1";

function readLocalProfile(): InvestorProfile {
  if (typeof window === "undefined") return DEFAULT_INVESTOR_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INVESTOR_PROFILE;
    return { ...DEFAULT_INVESTOR_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INVESTOR_PROFILE;
  }
}

function writeLocalProfile(profile: InvestorProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function useInvestorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? null;

  const queryKey = ["investorProfile", userId];

  const { data: profile = DEFAULT_INVESTOR_PROFILE, isPending } = useQuery({
    queryKey,
    queryFn: async () => {
      if (userId) {
        const ref = doc(db, "users", userId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const cloudProfile = data.investorProfile;
          if (cloudProfile && typeof cloudProfile === "object") {
            return { ...DEFAULT_INVESTOR_PROFILE, ...cloudProfile } as InvestorProfile;
          }
        }
        // First time cloud user: if local profile exists, write it over to cloud
        const local = readLocalProfile();
        if (local.completedAt || local.skipped || local.goal || local.reaction) {
          await setDoc(ref, { investorProfile: local }, { merge: true });
        }
        return local;
      } else {
        return readLocalProfile();
      }
    },
    staleTime: Infinity,
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<InvestorProfile>) => {
      const merged: InvestorProfile = {
        ...profile,
        ...patch,
        version: profile.version || 1,
      };

      if (userId) {
        const ref = doc(db, "users", userId);
        await setDoc(ref, { investorProfile: merged }, { merge: true });
      } else {
        writeLocalProfile(merged);
      }
      return merged;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<InvestorProfile>(queryKey) || DEFAULT_INVESTOR_PROFILE;
      const next: InvestorProfile = { ...prev, ...patch, version: prev.version || 1 };
      queryClient.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateProfile = (patch: Partial<InvestorProfile>) => updateMutation.mutate(patch);

  return { profile, updateProfile, isPending };
}
