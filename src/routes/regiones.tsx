import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/regiones')({ component: RegionsLayout });
function RegionsLayout() { return <Outlet />; }