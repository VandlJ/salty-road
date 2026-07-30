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

  return (
    <div className={`relative inline-block pb-0 sm:pb-5 ${className}`}>
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
