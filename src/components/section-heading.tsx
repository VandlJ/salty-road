import React from "react";

type SectionHeadingProps = {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "lg" | "md";
  align?: "left" | "center";
  className?: string;
};

export default function SectionHeading({
  children,
  as = "h2",
  size = "md",
  align = "center",
  className = "",
}: SectionHeadingProps) {
  const Tag = as;
  const sizeClasses = size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl";

  // inline-flex, not inline-block — an inline-block wrapper sits on the
  // surrounding text's baseline, leaving a "phantom" descender gap whose
  // size depends on the ambient font-size/line-height of wherever this
  // component happens to be dropped, so the same pb-5 read as a different
  // visual gap on different pages. Flex items don't inherit that baseline
  // alignment, so the gap becomes exactly pb-5, always.
  return (
    <div className={`relative inline-flex flex-col pb-0 sm:pb-5 ${className}`}>
      <Tag
        className={`${sizeClasses} font-extrabold text-white uppercase tracking-widest break-words hyphens-none ${
          align === "left" ? "text-left" : "text-center"
        }`}
      >
        {children}
      </Tag>
      <span className="hidden sm:block absolute bottom-0 left-0 h-[3px] w-12 bg-brand" />
    </div>
  );
}
