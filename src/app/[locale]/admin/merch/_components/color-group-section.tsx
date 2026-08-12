"use client";

import { useState } from "react";

import { type Translate, type ColorGroup } from "./shared";
import { VariantRow } from "./variant-row";
import { AddVariantForm } from "./add-variant-form";

export function ColorGroupSection({
  productId,
  group,
  t,
  onChange,
  showPhotos,
  onMove,
  canMoveUp,
  canMoveDown,
  moving,
}: {
  productId: string;
  group: ColorGroup;
  t: Translate;
  onChange: () => void;
  showPhotos: boolean;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moving: boolean;
}) {
  const [color, setColor] = useState(group.color);
  const [savingColor, setSavingColor] = useState(false);
  const dirty = color !== group.color;

  async function saveColor() {
    setSavingColor(true);
    try {
      // Every variant in the group shares the color name, so renaming the
      // group means patching all of them at once.
      await Promise.all(
        group.variants.map((v) =>
          fetch(`/api/admin/merch/variants/${v.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ color }),
          })
        )
      );
      onChange();
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="border border-gray-700 rounded-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 bg-white/5 px-3 py-2 border-b border-gray-700">
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={moving || !canMoveUp}
            aria-label={t("moveColorUp")}
            className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-base font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={moving || !canMoveDown}
            aria-label={t("moveColorDown")}
            className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-base font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ▼
          </button>
        </div>
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder={t("colorPlaceholder")}
          maxLength={60}
          className="flex-1 min-w-[140px] p-2 bg-white/5 border-2 border-gray-600 text-white text-sm font-bold focus:border-white focus:outline-none rounded-sm"
        />
        {dirty && (
          <button
            onClick={saveColor}
            disabled={savingColor}
            className="px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer rounded-sm disabled:opacity-50"
          >
            {t("save")}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 p-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
        {group.variants.map((variant) => (
          <VariantRow key={variant.id} variant={variant} t={t} onChange={onChange} showPhotos={showPhotos} />
        ))}
        <div className="lg:col-span-2">
          <AddVariantForm productId={productId} t={t} onCreated={onChange} presetColor={group.color} />
        </div>
      </div>
    </div>
  );
}

