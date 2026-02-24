import { useState, useEffect, useCallback } from "react";
import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface Question {
  q: string;
  a: string;
  difficulty: "easy" | "medium" | "hard";
  category: "script" | "themes" | "cultural" | "characters";
}

interface QuestionsData {
  questions: Question[];
}

type CategoryFilter = "all" | "script" | "themes" | "cultural" | "characters";

const categoryLabels: Record<string, string> = {
  script: "📜 Script",
  themes: "💭 Themes",
  cultural: "🎭 Cultural",
  characters: "🦌 Characters",
};

const difficultyColors: Record<string, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-red-500",
};

const TriviaPage = () => {
  useDocumentTitle("Trivia");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [currentFilter, setCurrentFilter] = useState<CategoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch("/rudolph-questions.json");
        const data: QuestionsData = await response.json();
        setQuestions(data.questions);
        setFilteredQuestions(data.questions);
        setLoading(false);
      } catch {
        setError("Error loading questions. Please try again.");
        setLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const flipCard = useCallback(() => {
    setIsFlipped((prev) => {
      if (!prev) {
        setStudiedCards(
          (prevStudied) => new Set([...prevStudied, currentIndex])
        );
      }
      return !prev;
    });
  }, [currentIndex]);

  const nextCard = useCallback(() => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, filteredQuestions.length]);

  const previousCard = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const shuffleCards = () => {
    const shuffled = [...filteredQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setFilteredQuestions(shuffled);
    setCurrentIndex(0);
    setStudiedCards(new Set());
    setIsFlipped(false);
  };

  const filterCategory = (category: CategoryFilter) => {
    setCurrentFilter(category);
    if (category === "all") {
      setFilteredQuestions([...questions]);
    } else {
      setFilteredQuestions(questions.filter((q) => q.category === category));
    }
    setCurrentIndex(0);
    setStudiedCards(new Set());
    setIsFlipped(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextCard();
      if (e.key === "ArrowLeft") previousCard();
      if (e.key === " ") {
        e.preventDefault();
        flipCard();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [nextCard, previousCard, flipCard]);

  // Handle card click based on which half was clicked
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;

    if (!isFlipped) {
      // Question side: left = previous, right = flip to answer
      if (isLeftHalf) {
        previousCard();
      } else {
        flipCard();
      }
    } else {
      // Answer side: left = flip back, right = next
      if (isLeftHalf) {
        setIsFlipped(false);
      } else {
        nextCard();
      }
    }
  };

  const currentQuestion = filteredQuestions[currentIndex];

  return (
    <PageSection className="flex-1 py-8 md:py-12">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">
            🦌 Rudolph Trivia Flashcards
          </h1>
          <p className="text-muted-foreground">
            Test your knowledge of the 1964 classic!
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 flex justify-center gap-4">
          <div className="rounded-xl bg-primary/10 px-6 py-3 text-center backdrop-blur">
            <div className="text-xs text-muted-foreground">Progress</div>
            <div className="text-xl font-bold">
              {loading ? "-" : currentIndex + 1}/
              {loading ? "-" : filteredQuestions.length}
            </div>
          </div>
          <div className="rounded-xl bg-primary/10 px-6 py-3 text-center backdrop-blur">
            <div className="text-xs text-muted-foreground">Studied</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-bold">{studiedCards.size}</span>
              {studiedCards.size > 0 && (
                <button
                  onClick={() => setStudiedCards(new Set())}
                  className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
                  title="Reset studied count"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 rounded-xl bg-muted/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Filter by Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {(
              ["all", "script", "themes", "cultural", "characters"] as const
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => filterCategory(cat)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  currentFilter === cat
                    ? "bg-primary text-primary-foreground outline outline-2 outline-offset-2 outline-primary"
                    : "bg-white/70 text-foreground hover:scale-105 hover:bg-white hover:shadow-md"
                }`}
              >
                {cat === "all"
                  ? "All"
                  : categoryLabels[cat]?.replace(/^. /, "") || cat}
              </button>
            ))}
          </div>
        </div>

        {/* Flashcard */}
        <div
          onClick={handleCardClick}
          className={`relative min-h-[350px] cursor-pointer rounded-2xl p-8 shadow-xl transition-all hover:-translate-y-1 md:min-h-[400px] md:p-10 ${
            isFlipped ? "bg-emerald-100" : "bg-sky-100"
          }`}
        >
          {loading ? (
            <div className="flex h-full min-h-[280px] items-center justify-center text-muted-foreground">
              Loading questions...
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[280px] items-center justify-center text-red-500">
              {error}
            </div>
          ) : currentQuestion ? (
            <>
              {/* Category Badge */}
              <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {categoryLabels[currentQuestion.category]}
              </span>

              {/* Difficulty Badge */}
              <span
                className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase text-white ${
                  difficultyColors[currentQuestion.difficulty]
                }`}
              >
                {currentQuestion.difficulty}
              </span>

              {/* Question/Answer */}
              <div className="flex min-h-[280px] items-center justify-center text-center">
                {!isFlipped ? (
                  <p className="text-lg leading-relaxed md:text-xl">
                    {currentQuestion.q}
                  </p>
                ) : (
                  <p className="text-lg font-medium leading-relaxed text-primary md:text-xl">
                    {currentQuestion.a}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center text-muted-foreground">
              No questions found for this category.
            </div>
          )}
        </div>

        {/* Flip Hint */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {!isFlipped
            ? "← Previous | Click right to flip →"
            : "← Flip back | Click right for next →"}
        </p>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={previousCard}
            disabled={currentIndex === 0}
            className="cursor-pointer rounded-lg bg-card px-5 py-2.5 font-medium shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            ← Previous
          </button>
          <button
            onClick={flipCard}
            className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            Flip Card
          </button>
          <button
            onClick={nextCard}
            disabled={currentIndex >= filteredQuestions.length - 1}
            className="cursor-pointer rounded-lg bg-card px-5 py-2.5 font-medium shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Next →
          </button>
          <button
            onClick={shuffleCards}
            className="cursor-pointer rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            🔀 Shuffle
          </button>
        </div>
      </div>
    </PageSection>
  );
};

export default TriviaPage;
