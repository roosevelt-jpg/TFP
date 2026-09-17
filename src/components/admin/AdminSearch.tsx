"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import { AdminIcons } from "@/components/admin/icons";
import type { AdminSearchHit } from "@/lib/admin/search-types";

type SearchResponse = {
  q: string;
  results: AdminSearchHit[];
};

export function AdminSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdminSearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [, startTransition] = useTransition();
  const reqId = useRef(0);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/search?q=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as SearchResponse;
      if (id !== reqId.current) return;
      setResults(data.results);
      setActive(0);
    } catch {
      /* ignore transient */
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, runSearch]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: AdminSearchHit) {
    setOpen(false);
    setQuery("");
    setResults([]);
    startTransition(() => {
      router.push(hit.href);
    });
  }

  const showPanel = open && query.trim().length >= 2;

  return (
    <div className={`cmd-search${open ? " is-open" : ""}`} ref={rootRef}>
      <div className="cmd-topbar-search">
        <AdminIcons name="search" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search anything…"
          aria-label="Search Command"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
              return;
            }
            if (!showPanel || results.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const hit = results[active];
              if (hit) go(hit);
            }
          }}
        />
        <kbd className="cmd-search-kbd">⌘K</kbd>
      </div>

      {showPanel ? (
        <div className="cmd-search-panel" role="listbox" id={listId}>
          {loading && results.length === 0 ? (
            <div className="cmd-search-empty">Searching…</div>
          ) : results.length === 0 ? (
            <div className="cmd-search-empty">No matches for “{query.trim()}”</div>
          ) : (
            results.map((hit, index) => (
              <Link
                key={hit.id}
                href={hit.href}
                role="option"
                aria-selected={index === active}
                className={`cmd-search-hit${index === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={(event) => {
                  event.preventDefault();
                  go(hit);
                }}
              >
                <span className="cmd-search-type">{hit.type}</span>
                <span className="cmd-search-copy">
                  <span className="cmd-search-title">{hit.title}</span>
                  {hit.subtitle ? (
                    <span className="cmd-search-sub">{hit.subtitle}</span>
                  ) : null}
                </span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
