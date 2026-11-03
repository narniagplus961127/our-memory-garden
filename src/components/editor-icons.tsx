export function EditorIcon({ name }: { name: string }) {
  return (
    <svg
      className="editor-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "content" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <path d="M12 7v10M7 12h10" />
        </>
      ) : name === "settings" ? (
        <>
          <path d="M4 7h16M4 17h16" />
          <circle cx="9" cy="7" r="3" fill="currentColor" />
          <circle cx="15" cy="17" r="3" fill="currentColor" />
        </>
      ) : name === "outline" ? (
        <>
          <path d="M9 5h11M9 12h11M9 19h11" />
          <path d="M4 5h.01M4 12h.01M4 19h.01" strokeWidth="3" />
        </>
      ) : name === "page" ? (
        <>
          <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />
        </>
      ) : name === "desktop" ? (
        <>
          <rect x="2.5" y="3.5" width="19" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </>
      ) : name === "mobile" ? (
        <>
          <rect x="6" y="2" width="12" height="20" rx="2.5" />
          <path d="M11 18h2" />
        </>
      ) : name === "back" ? (
        <path d="m14 5-7 7 7 7" />
      ) : (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M15 4v16" />
        </>
      )}
    </svg>
  );
}
