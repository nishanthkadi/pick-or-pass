type SectionHeadingProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  id?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  title,
  description,
  eyebrow,
  id,
  align = "left",
}: SectionHeadingProps) {
  return (
    <header className={align === "center" ? "text-center" : ""}>
      {eyebrow && <p className="text-eyebrow mb-2">{eyebrow}</p>}
      <h2 id={id} className="text-section-title text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-prose text-base leading-relaxed text-muted">
          {description}
        </p>
      )}
    </header>
  );
}
