import { NavLink } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { navItems, settingsItem } from '../../data/navigation'

type SidebarProps = {
  open: boolean
  onNavigate: () => void
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <NavLink to="/" className="brand" onClick={onNavigate}>
        <span className="brand-mark">
          <MessageCircle size={18} strokeWidth={2.2} />
        </span>
        LinguaBot
      </NavLink>

      <div className="nav-label">ВАШЕ ПРОСТРАНСТВО</div>
      <nav className="nav-list">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <item.icon strokeWidth={1.8} />
            {item.label}
            {item.badge ? <span className="nav-dot" /> : null}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to={settingsItem.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={onNavigate}
        >
          <settingsItem.icon strokeWidth={1.8} />
          {settingsItem.label}
        </NavLink>
      </div>
    </aside>
  )
}
