type DashboardCardProps = {
  title: string;
  description: string;
  eyebrow?: string;
  children?: React.ReactNode;
};

export function DashboardCard({
  title,
  description,
  eyebrow,
  children,
}: DashboardCardProps) {
  return (
    <article className="technical-home__card">
      {eyebrow ? <span className="technical-home__section-label">{eyebrow}</span> : null}
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </article>
  );
}
