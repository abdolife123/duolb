import { useEffect, useMemo, useState } from "react";
import { supabase } from "src/lib/supabase";

type Review = {
  id: string | number;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

type Props = {
  salonId: string | number;
  salonSlug?: string;
};

// Helper: compute average rating from all approved reviews.
function calculateAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1" aria-label={`${rating} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={index < rating ? "text-amber-500" : "text-gray-300"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function SalonReviewsClient({ salonId, salonSlug }: Props) {
  // Data state for approved reviews.
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state for new review submission.
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const averageRating = useMemo(() => calculateAverageRating(reviews), [reviews]);

  // Fetch approved reviews for the current salon.
  async function loadReviews() {
    setIsLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from("salon_reviews")
      .select("id, reviewer_name, rating, comment, created_at")
      .eq("salon_id", salonId)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError("Bewertungen konnten nicht geladen werden.");
      setReviews([]);
    } else {
      setReviews((data as Review[]) ?? []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadReviews();
  }, [salonId]);

  // Validate and submit a new review to the API endpoint.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      setFormMessage("Bitte eine Bewertung von 1 bis 5 wählen.");
      return;
    }

    if (!reviewerName.trim() || !comment.trim()) {
      setFormMessage("Name und Kommentar sind erforderlich.");
      return;
    }

    setIsSubmitting(true);

    try {
      let resolvedSalonId = Number(salonId);
      if (salonSlug) {
        const { data: salonRow, error: salonLookupError } = await supabase
          .from("salons")
          .select("id")
          .eq("slug", salonSlug)
          .maybeSingle();

        if (salonLookupError || !salonRow?.id) {
          console.error("Salon lookup failed before submit:", salonLookupError, salonSlug);
          setFormMessage("Salon-ID konnte nicht ermittelt werden.");
          return;
        }

        resolvedSalonId = Number(salonRow.id);
      }

      if (!Number.isInteger(resolvedSalonId) || resolvedSalonId <= 0) {
        setFormMessage("Ungültige Salon-ID.");
        return;
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salon_id: resolvedSalonId,
          salon_slug: salonSlug,
          reviewer_name: reviewerName.trim(),
          rating: parsedRating,
          comment: comment.trim(),
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean; message?: string }
        | null;

      if (!response.ok) {
        console.error("Review submit API error:", response.status, result);
        setFormMessage(result?.error || "Bewertung konnte nicht gesendet werden.");
        return;
      }

      setReviewerName("");
      setRating(5);
      setComment("");
      setFormMessage(result?.message || "Danke! Deine Bewertung wurde eingereicht.");
    } catch {
      setFormMessage("Netzwerkfehler beim Senden der Bewertung.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Summary block with average rating and review count. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-gray-900">Bewertungen</h2>
        <div className="flex items-center gap-3">
          <Stars rating={Math.round(averageRating)} />
          <span className="text-sm text-gray-600">
            {reviews.length > 0
              ? `${averageRating.toFixed(1)} / 5 (${reviews.length})`
              : "Noch keine Bewertungen"}
          </span>
        </div>
      </div>

      {/* Approved reviews list. */}
      <div className="space-y-4">
        {isLoading && <p className="text-sm text-gray-500">Lade Bewertungen...</p>}
        {!isLoading && loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!isLoading && !loadError && reviews.length === 0 && (
          <p className="text-sm text-gray-500">Sei die erste Person mit einer Bewertung.</p>
        )}

        {!isLoading &&
          !loadError &&
          reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium text-gray-900">{review.reviewer_name}</p>
                <time className="text-xs text-gray-500">
                  {new Date(review.created_at).toLocaleDateString("de-DE")}
                </time>
              </div>
              <div className="mb-2">
                <Stars rating={review.rating} />
              </div>
              <p className="text-sm leading-relaxed text-gray-700">{review.comment}</p>
            </article>
          ))}
      </div>

      {/* New review form with frontend validation. */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">Bewertung schreiben</h3>

        <div className="space-y-1">
          <label htmlFor="reviewerName" className="text-sm font-medium text-gray-700">
            Dein Name
          </label>
          <input
            id="reviewerName"
            type="text"
            value={reviewerName}
            onChange={(event) => setReviewerName(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            maxLength={80}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reviewRating" className="text-sm font-medium text-gray-700">
            Bewertung (1-5)
          </label>
          <select
            id="reviewRating"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} Stern{value === 1 ? "" : "e"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="reviewComment" className="text-sm font-medium text-gray-700">
            Kommentar
          </label>
          <textarea
            id="reviewComment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            maxLength={1200}
            required
          />
        </div>

        <p className="min-h-5 text-sm text-gray-700">{formMessage || "\u00A0"}</p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sende..." : "Bewertung senden"}
        </button>
      </form>
    </section>
  );
}
