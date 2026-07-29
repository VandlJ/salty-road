import React from "react";

type SectionHeadingProps = {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "lg" | "md";
  className?: string;
};

export default function SectionHeading({
  children,
  as = "h2",
  size = "md",
  className = "",
}: SectionHeadingProps) {
  const Tag = as;
  const sizeClasses = size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl";

  return (
    <div className={`relative inline-block pb-5 ${className}`}>
      <Tag className={`${sizeClasses} font-extrabold text-white uppercase tracking-widest break-words hyphens-none`}>
        {children}
      </Tag>
      <span className="absolute bottom-0 left-0 h-[3px] w-12 bg-red-600" />
    </div>
  );
}
