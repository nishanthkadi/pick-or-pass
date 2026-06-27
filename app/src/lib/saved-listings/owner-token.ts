"use client";

import { useState } from "react";

const OWNER_TOKEN_KEY = "pick-or-pass-owner-token";

function getOrCreateOwnerToken() {
  try {
    const existing = window.localStorage.getItem(OWNER_TOKEN_KEY);
    if (existing) return existing;

    const token = crypto.randomUUID();
    window.localStorage.setItem(OWNER_TOKEN_KEY, token);
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

export function useOwnerToken() {
  const [ownerToken] = useState(getOrCreateOwnerToken);
  return ownerToken;
}
