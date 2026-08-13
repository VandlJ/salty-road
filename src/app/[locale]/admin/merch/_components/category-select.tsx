"use client";

import { useState } from "react";

import { CATEGORY_OPTIONS, CATEGORY_LABEL_KEY, type Translate } from "./shared";

export function CategorySelect({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: Translate;
}) {
  const isKnown = (CATEGORY_OPTIONS as readonly string[]).includes(value);
  const [custom, setCustom] = useState(value !== "" && !isKnown);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={custom ? "__custom__" : value}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm cursor-pointer"
      >
        <option value="" disabled className="bg-[#111]">
          —
        </option>
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c} className="bg-[#111]">
            {t(CATEGORY_LABEL_KEY[c])}
          </option>
        ))}
        <option value="__custom__" className="bg-[#111]">
          {t("categoryCustom")}
        </option>
      </select>
      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("categoryCustomPlaceholder")}
          maxLength={40}
          className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
      )}
    </div>
  );
}

