import { Link, useLocation } from 'react-router-dom'

function Header() {
  const { pathname } = useLocation()
  const titleMap: Record<string, string> = {
    '/': 'Home',
    '/convert': 'Compress',
    '/browse': 'Browse',
  }
  const title = titleMap[pathname] ?? 'Mini Vidi'

  return (
    <header className="app-header">
      <Link to="/" className="app-header__title">
        {title}
      </Link>
      <nav className="app-header__nav">
        <Link to="/">Home</Link> | <Link to="/convert">Compress</Link> |{' '}
        <Link to="/browse">Browse</Link>
      </nav>
    </header>
  )
}

export default Header
