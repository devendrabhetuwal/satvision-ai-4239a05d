import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Layers, Share2 } from "lucide-react";
import { getTimeseriesShare } from "@/lib/timeseries-shares.functions";
import {
  TimeseriesResults,
  type IndexKey,
} from "@/components/timeseries/TimeseriesResults";

const shareQuery = (id: string) =>
  queryOptions({
    queryKey: ["timeseries-share", id],
    queryFn: () => getTimeseriesShare({ data: { id } }),
  });

export const Route = createFileRoute("/share/timeseries/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(shareQuery(params.id)),
  head: ({ loaderData }) => {
    const title = loaderData?.title ?? "Shared Time-Series — SatVision AI";
    const description = loaderData
      ? `Shared NDVI/NDWI/NDBI time-series across ${loaderData.payload.scenes.length} acquisition${loaderData.payload.scenes.length === 1 ? "" : "s"}.`
      : "Shared NDVI/NDWI/NDBI time-series analysis from SatVision AI.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass max-w-md rounded-2xl p-8 text-center">
          <h1 className="text-lg font-bold mb-2" style={{ fontFamily: "Space Grotesk" }}>
            Share unavailable
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "This share link could not be loaded."}
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                reset();
                router.invalidate();
              }}
              className="glass rounded-full px-4 py-1.5 text-xs hover:bg-white/5"
            >
              Retry
            </button>
            <Link to="/" className="glass rounded-full px-4 py-1.5 text-xs hover:bg-white/5">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-lg font-bold mb-2" style={{ fontFamily: "Space Grotesk" }}>
          Share not found
        </h1>
        <Link to="/" className="text-primary text-sm hover:underline">
          Go home
        </Link>
      </div>
    </div>
  ),
  component: SharedTimeseriesPage,
});

function SharedTimeseriesPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(shareQuery(id));
  const [activeIndex, setActiveIndex] = useState<IndexKey>(
    data.payload.activeIndex
  );

  const scenes = data.payload.scenes.map((s) => ({
    ...s,
    bbox: s.bbox as [number, number, number, number],
    bboxLatLng: s.bboxLatLng as [number, number, number, number] | null,
  }));
  const { red, green, nir, swir } = data.payload.bandMapping;
  const first = scenes[0]?.date;
  const last = scenes[scenes.length - 1]?.date;

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-b border-border/40">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> SatVision AI
          </Link>
          <h1
            className="text-sm font-bold flex items-center gap-2"
            style={{ fontFamily: "Space Grotesk" }}
          >
            <Share2 className="h-3.5 w-3.5 text-primary" />
            Shared <span className="text-gradient">Time-Series</span>
          </h1>
          <div className="w-24" />
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-6">
        <section className="glass mb-6 rounded-2xl p-5">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Read-only snapshot
          </div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk" }}>
            {data.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {first} → {last} · {scenes.length} scene
              {scenes.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Bands — R:{red} G:{green} NIR:{nir} SWIR:{swir}
            </span>
            <span>
              Shared {new Date(data.created_at).toLocaleDateString()}
            </span>
          </div>
        </section>

        <TimeseriesResults
          scenes={scenes}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          readOnly
        />
      </div>
    </div>
  );
}