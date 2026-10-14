import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { navigate } from "@/lib/router";

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
}

/**
 * Anchor that navigates client-side on plain left clicks while keeping native
 * behavior (new tab, copy link) for modified clicks.
 */
export function Link({ href, replace, onClick, target, ...props }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (target && target !== "_self")
    ) {
      return;
    }
    event.preventDefault();
    navigate(href, { replace });
  };

  return <a href={href} target={target} onClick={handleClick} {...props} />;
}
