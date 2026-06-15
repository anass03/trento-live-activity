function execCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
}

/**
 * Cross-platform share/copy:
 * 1. navigator.share (mobile + Chrome/Edge desktop)
 * 2. navigator.clipboard.writeText (modern desktop, HTTPS)
 * 3. execCommand("copy") textarea trick (legacy / HTTP fallback)
 *
 * Returns true if share sheet was opened, false if clipboard copy was used.
 * Throws only if the user explicitly cancels a share sheet (AbortError).
 */
export async function shareOrCopy(opts: { title: string; text: string; url: string }): Promise<"shared" | "copied"> {
  const clipText = `${opts.text}\n${opts.url}`;

  if (navigator.share) {
    await navigator.share(opts);
    return "shared";
  }

  try {
    await navigator.clipboard.writeText(clipText);
  } catch {
    execCopy(clipText);
  }
  return "copied";
}
