import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getAuthUser } from "./platform-auth";

export type PromoterProfile = Database["public"]["Tables"]["profiles"]["Row"];

interface StoredPromoterProfile {
  profile: PromoterProfile;
  photo: string | null;
}

const PROFILE_STORAGE_PREFIX = "tlamatik_promoter_profile_";

function buildDefaultProfile(
  userId: string,
  displayName = "",
  email = "",
): PromoterProfile {
  return {
    id: userId,
    avatar_path: null,
    bio: "",
    communities: "",
    credential: "",
    display_name: displayName,
    ethics_accepted: false,
    experience_years: 0,
    official_id: "",
    organization: "",
    professional_email: email,
    professional_title: "",
    region: "Oaxaca",
    specialties: [],
    submitted_at: null,
    updated_at: new Date().toISOString(),
  };
}

function readLocalProfile(userId: string): StoredPromoterProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPromoterProfile;
  } catch {
    return null;
  }
}

function writeLocalProfile(userId: string, data: StoredPromoterProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${PROFILE_STORAGE_PREFIX}${userId}`,
      JSON.stringify(data),
    );
  } catch {
    // ignore storage quota errors
  }
}

async function fileToCompactDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl || typeof document === "undefined") {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const maxSide = 400;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const profileOptions = (userId: string) =>
  queryOptions({
    queryKey: ["promoter-profile", userId],
    queryFn: async (): Promise<StoredPromoterProfile> => {
      const local = readLocalProfile(userId);
      if (local) return local;

      const platformUser = await getAuthUser();
      const defaultDisplayName = platformUser?.displayName ?? "";
      const defaultEmail =
        platformUser?.email && !platformUser.email.endsWith("@tlamatik.local")
          ? platformUser.email
          : "";

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          if (!error && data) {
            let photo: string | null = null;
            if (data.avatar_path) {
              const result = await supabase.storage
                .from("promoter-photos")
                .createSignedUrl(data.avatar_path, 3600);
              if (!result.error) photo = result.data.signedUrl;
            }
            return { profile: data, photo };
          }
        }
      } catch {
        // fallback to default local profile
      }

      return {
        profile: buildDefaultProfile(userId, defaultDisplayName, defaultEmail),
        photo: null,
      };
    },
    staleTime: 60_000,
  });

/** Saves the promoter profile locally and optionally syncs to Supabase when a remote session is active. */
export async function savePromoterProfile(input: {
  userId: string;
  updates: Omit<PromoterProfile, "id">;
  photoFile?: File | null;
  existingPhotoUrl?: string | null;
}): Promise<StoredPromoterProfile> {
  let photoUrl = input.existingPhotoUrl ?? null;
  let avatarPath = input.updates.avatar_path;

  if (input.photoFile) {
    photoUrl = await fileToCompactDataUrl(input.photoFile);
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      if (input.photoFile) {
        const ext = input.photoFile.type === "image/png" ? "png" : "jpg";
        const path = `${input.userId}/${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage
          .from("promoter-photos")
          .upload(path, input.photoFile);
        if (!upload.error) avatarPath = path;
      }
      await supabase
        .from("profiles")
        .upsert({
          id: input.userId,
          ...input.updates,
          avatar_path: avatarPath,
        })
        .select("id")
        .single();
    }
  } catch {
    // persist locally even if remote Supabase session is absent
  }

  const stored: StoredPromoterProfile = {
    profile: {
      id: input.userId,
      ...input.updates,
      avatar_path: avatarPath,
    },
    photo: photoUrl,
  };
  writeLocalProfile(input.userId, stored);
  return stored;
}
