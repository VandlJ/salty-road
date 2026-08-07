"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";

const YOUTUBE_IDS = ["11di09owZRU", "uKLELTHzO9M"];

export default function VideosSection() {
  const t = useTranslations("ArchivePage.videos");

  return (
    <section
      id="videos"
      className="reveal-on-scroll bg-transparent text-white px-4 py-12 md:py-20 scroll-mt-24 text-center"
    >
      <div className="max-w-5xl mx-auto">
        <SectionHeading as="h2" size="lg" className="mb-4">
          {t("title")}
        </SectionHeading>
        <p className="text-gray-400 text-sm mb-10">{t("subtitle")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {YOUTUBE_IDS.map((id) => (
            <VideoTile key={id} youtubeId={id} title={t("title")} playLabel={t("playLabel")} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoTile({
  youtubeId,
  title,
  playLabel,
}: {
  youtubeId: string;
  title: string;
  playLabel: string;
}) {
  const [playing, setPlaying] = useState(false);
  // maxresdefault isn't generated for every video (depends on the source
  // resolution) — falls back to hqdefault, which YouTube always generates,
  // instead of risking a broken image on the homepage.
  const [thumbSrc, setThumbSrc] = useState(`https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`);

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-800 bg-black shadow-lg shadow-black/50">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={playLabel}
          className="absolute inset-0 w-full h-full cursor-pointer group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, next/image would need remotePatterns config for this one-off use */}
          <img
            src={thumbSrc}
            alt=""
            loading="lazy"
            onError={() => setThumbSrc(`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-brand/90 group-hover:bg-brand rounded-full shadow-lg transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
