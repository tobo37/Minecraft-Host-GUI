import { useSyncExternalStore } from "react";

/**
 * Minimal History-API router. The Bun server serves index.html for every
 * non-API path, so all routes below can be opened directly as deep links.
 */

export type ServerView = "overview" | "configuration" | "files" | "java" | "rcon";

export type Route =
  | { name: "projects" }
  | { name: "create" }
  | { name: "server"; serverId: string; view: ServerView }
  | { name: "notFound" };

const VIEW_SEGMENTS: Record<ServerView, string> = {
  overview: "",
  configuration: "config",
  files: "files",
  java: "java",
  rcon: "rcon",
};

const NAVIGATION_EVENT = "app:navigate";

export const routes = {
  projects: () => "/",
  create: () => "/new",
  server: (serverId: string, view: ServerView = "overview") => {
    const base = `/servers/${encodeURIComponent(serverId)}`;
    const segment = VIEW_SEGMENTS[view];
    return segment ? `${base}/${segment}` : base;
  },
};

export function parseRoute(pathname: string): Route {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { name: "projects" };
  }

  if (segments.length === 1 && segments[0] === "new") {
    return { name: "create" };
  }

  if (segments[0] === "servers" && segments[1] && segments.length <= 3) {
    const segment = segments[2] ?? "";
    const view = (Object.keys(VIEW_SEGMENTS) as ServerView[]).find(
      (key) => VIEW_SEGMENTS[key] === segment
    );
    if (view) {
      try {
        return { name: "server", serverId: decodeURIComponent(segments[1]), view };
      } catch {
        return { name: "notFound" };
      }
    }
  }

  return { name: "notFound" };
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  const current = window.location.pathname + window.location.search;
  if (to === current) {
    return;
  }

  const previousPathname = window.location.pathname;
  if (options.replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
  }
  window.dispatchEvent(new Event(NAVIGATION_EVENT));

  // Query-only changes (folder, selected file) keep the scroll position.
  if (window.location.pathname !== previousPathname) {
    window.scrollTo(0, 0);
  }
}

/**
 * Update a single query parameter of the current URL, keeping the others.
 */
export function setSearchParam(
  key: string,
  value: string | null,
  options: { replace?: boolean } = {}
) {
  const search = new URLSearchParams(window.location.search);
  if (value) {
    search.set(key, value);
  } else {
    search.delete(key);
  }
  const query = search.toString();
  navigate(query ? `${window.location.pathname}?${query}` : window.location.pathname, options);
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATION_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATION_EVENT, onChange);
  };
}

function getPathname() {
  return window.location.pathname;
}

function getSearch() {
  return window.location.search;
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, getPathname);
  return parseRoute(pathname);
}

export function useSearchParam(key: string): string | null {
  const search = useSyncExternalStore(subscribe, getSearch);
  return new URLSearchParams(search).get(key);
}
