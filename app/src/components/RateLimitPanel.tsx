import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type RateLimitPanelProps = {
  rateLimited: boolean;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  canAnalyze: boolean;
  loading: boolean;
  onAnalyzeWithKey: () => void;
  onDismiss?: () => void;
  embedded?: boolean;
};

export function RateLimitPanel({
  rateLimited,
  apiKey,
  onApiKeyChange,
  canAnalyze,
  loading,
  onAnalyzeWithKey,
  onDismiss,
  embedded = false,
}: RateLimitPanelProps) {
  const title = rateLimited
    ? "You've used today's free checks"
    : "Use your own API key";

  const message = rateLimited ? (
    <>
      Try a sample listing (always free), come back tomorrow, or add your own
      free API key from{" "}
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2"
      >
        Google AI Studio
      </a>
      . Your key is never stored.
    </>
  ) : (
    <>
      Add a free key from{" "}
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2"
      >
        Google AI Studio
      </a>{" "}
      to analyze without limits. Your key stays in your browser only for this
      session.
    </>
  );

  const content = (
    <>
      {embedded ? (
        <div>
          <h4 id="rate-limit-heading" className="text-subsection-title">
            {title}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-muted">{message}</p>
        </div>
      ) : (
        <Alert variant="warning" role="status">
          <div>
            <h3 id="rate-limit-heading" className="text-subsection-title">
              {title}
            </h3>
            <p className="mt-2 leading-relaxed">{message}</p>
          </div>
        </Alert>
      )}

      <div
        className={
          embedded
            ? "mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
            : "mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        }
      >
        <div className="flex-1">
          <label htmlFor="byok-api-key" className="text-subsection-title">
            Your API key
          </label>
          <input
            id="byok-api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Paste your API key here"
            className="mt-2 w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-1"
          />
        </div>
        <Button
          type="button"
          disabled={!canAnalyze || !apiKey.trim() || loading}
          onClick={onAnalyzeWithKey}
          className="sm:shrink-0"
        >
          Analyze with my key
        </Button>
      </div>

      {!rateLimited && onDismiss && (
        <Button
          type="button"
          variant="ghost"
          onClick={onDismiss}
          className="mt-2"
        >
          Dismiss
        </Button>
      )}
    </>
  );

  if (embedded) {
    return (
      <div aria-labelledby="rate-limit-heading">{content}</div>
    );
  }

  return (
    <section aria-labelledby="rate-limit-heading">{content}</section>
  );
}
