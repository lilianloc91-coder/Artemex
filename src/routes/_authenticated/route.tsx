import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthUser } from "@/lib/platform-auth";
import { protectedDestination } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getAuthUser();
    if (!user) {
      throw redirect({
        to: "/auth",
        search: { next: protectedDestination(location.pathname) },
      });
    }
    return { user };
  },
  component: Outlet,
});
