import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAuthUser,
  onAuthChange,
  type PlatformUser,
} from "@/lib/platform-auth";

const AuthContext = createContext<{
  user: PlatformUser | null;
  loading: boolean;
}>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const syncAuth = async () => {
      const currentUser = await getAuthUser();
      if (!active) return;
      setUser(currentUser);
      setLoading(false);
    };

    const unsubscribe = onAuthChange(() => {
      void syncAuth().then(() => {
        void router.invalidate();
        void queryClient.invalidateQueries();
      });
    });

    void syncAuth();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, queryClient]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAccount = () => useContext(AuthContext);
