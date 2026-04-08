interface BreadcrumbProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export function Breadcrumb({ currentPath, onNavigate }: BreadcrumbProps) {
  // Split path into segments: "/" → ["~"], "/projects/foo" → ["~", "projects", "foo"]
  const parts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean)

  const segments = [
    { label: '~', path: '/' },
    ...parts.map((part, i) => ({
      label: part,
      path: '/' + parts.slice(0, i + 1).join('/'),
    })),
  ]

  return (
    <nav
      style={{
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        padding: '6px 12px',
        fontSize: '13px',
        background: '#1e1e2e',
        color: '#cdd6f4',
        borderBottom: '1px solid #313244',
      }}
    >
      {segments.map((seg, i) => (
        <span key={seg.path}>
          {i > 0 && <span style={{ color: '#6c7086', margin: '0 4px' }}>/</span>}
          {i < segments.length - 1 ? (
            <button
              onClick={() => onNavigate(seg.path)}
              style={{
                background: 'none',
                border: 'none',
                color: '#89b4fa',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
                textDecoration: 'underline',
              }}
            >
              {seg.label}
            </button>
          ) : (
            <span style={{ color: '#cdd6f4', fontWeight: 600 }}>{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
