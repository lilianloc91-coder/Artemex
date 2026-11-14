import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/pey")({
  server: {
    handlers: {
      GET: async () => {
        const { listRecentPeyWebhookEvents } = await import(
          "@/lib/pey/webhook.server"
        );
        const recent = listRecentPeyWebhookEvents();
        return new Response(
          JSON.stringify({
            ok: true,
            endpoint: "/api/webhooks/pey",
            protocol: "Standard Webhooks (pey.mx)",
            supportedEvents: [
              "codi.qr.payment_received",
              "codi.pn.payment_received",
              "payment_link.payment_received",
              "payment_link.completed",
            ],
            recentCount: recent.length,
            recentEvents: recent.slice(0, 10),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
      POST: async ({ request }) => {
        const { processPeyWebhookEvent } = await import(
          "@/lib/pey/webhook.server"
        );
        try {
          const rawBody = await request.text();
          const webhookId =
            request.headers.get("webhook-id") ??
            request.headers.get("svix-id");
          const webhookTimestamp =
            request.headers.get("webhook-timestamp") ??
            request.headers.get("svix-timestamp");
          const webhookSignature =
            request.headers.get("webhook-signature") ??
            request.headers.get("svix-signature");

          const processed = await processPeyWebhookEvent({
            rawBody,
            webhookId,
            webhookTimestamp,
            webhookSignature,
          });

          return new Response(
            JSON.stringify({
              received: true,
              duplicate: processed.duplicate,
              event: processed,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Webhook processing error";
          const isAuthError =
            message.toLowerCase().includes("signature") ||
            message.toLowerCase().includes("headers") ||
            message.toLowerCase().includes("timestamp");
          return new Response(
            JSON.stringify({
              received: false,
              error: message,
            }),
            {
              status: isAuthError ? 401 : 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});

