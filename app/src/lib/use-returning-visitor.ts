"use client";

import { useCallback, useEffect, useState } from "react";

const VISITED_KEY = "mtc-has-visited";
const RESULTS_KEY = "mtc-results-count";

export function useReturningVisitor() {
  const [isReturning, setIsReturning] = useState(false);
  const [resultsViewCount, setResultsViewCount] = useState(0);

  useEffect(() => {
    try {
      setIsReturning(localStorage.getItem(VISITED_KEY) === "1");
      setResultsViewCount(
        Number.parseInt(localStorage.getItem(RESULTS_KEY) ?? "0", 10) || 0,
      );
    } catch {
      /* private browsing */
    }
  }, []);

  const markVisited = useCallback(() => {
    try {
      localStorage.setItem(VISITED_KEY, "1");
      setIsReturning(true);
    } catch {
      /* ignore */
    }
  }, []);

  const markResultsViewed = useCallback(() => {
    try {
      setResultsViewCount((prev) => {
        const next = prev + 1;
        localStorage.setItem(RESULTS_KEY, String(next));
        return next;
      });
    } catch {
      /* ignore */
    }
  }, []);

  return {
    isReturning,
    resultsViewCount,
    markVisited,
    markResultsViewed,
    collapseListingByDefault: resultsViewCount >= 1,
  };
}
