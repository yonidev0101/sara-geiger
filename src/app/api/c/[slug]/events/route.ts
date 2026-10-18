import { subscribe } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-Sent Events: pushes a small signal on every change so open pages refetch at once.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send('retry: 3000\n\n');
      send(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);
      const off = subscribe(slug, (evt) => send(`data: ${JSON.stringify(evt)}\n\n`));
      const ping = setInterval(() => send(': ping\n\n'), 25_000);
      cleanup = () => {
        off();
        clearInterval(ping);
      };
      req.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
