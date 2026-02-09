import React from "react";

type CategoryLink = { name: string; slug: string };

export default function HomeNearMeClient({ categories }: { categories: CategoryLink[] }) {
  return (
    <section className="home-near-me" aria-label="Salons in deiner Nähe">
      <h2>Salons in deiner Nähe</h2>
      <p>Wähle eine Kategorie, dann zeigen wir dir Anbieter in der Umgebung.</p>

      <div className="near-category-grid">
        {categories.map((cat) => (
          <a key={cat.slug} href={`/near-you/${cat.slug}`} className="near-category-card">
            {cat.name}
          </a>
        ))}
      </div>
    </section>
  );
}

