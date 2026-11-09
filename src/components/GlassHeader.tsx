"use client";
import type { VinylPlayer as Player } from "@/hooks/useVinylPlayer";
import VinylPlayer from "./VinylPlayer";

export default function GlassHeader({
  player,
  reducedMotion,
}: {
  player: Player;
  reducedMotion: boolean;
}) {
  return (
    <header className="minimal-hud">
      <div className="minimal-controls">
        <VinylPlayer player={player} reducedMotion={reducedMotion} />
      </div>
    </header>
  );
}
