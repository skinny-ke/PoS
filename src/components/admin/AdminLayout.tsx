import { ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Store,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/badge';

interface AdminLayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AdminLayout({ children, activeView, onViewChange }: AdminLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'financial', label: 'Financial Reports', icon: BarChart3 },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
    { id: 'pos', label: 'Point of Sale', icon: Store },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white">MW</span>
            </div>
            <div>
              <h3 className="text-green-600">Murimi-Wholesalers</h3>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start ${
                  isActive ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">{user?.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </div>
          <Button variant="outline" className="w-full" size="sm" onClick={() => onViewChange('customer')}>
            <Store className="w-4 h-4 mr-2" />
            Customer View
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
