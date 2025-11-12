import { ShoppingCart, User, Menu, Search, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onCartClick: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onOrdersClick?: () => void;
}

export function Header({ onCartClick, onSearchChange, searchQuery, onOrdersClick }: HeaderProps) {
  const { itemCount } = useCart();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white">MW</span>
            </div>
            <div>
              <h1 className="text-green-600">Murimi-Wholesalers</h1>
              <p className="text-muted-foreground text-xs">Quality at Wholesale Prices</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            {onOrdersClick && (
              <Button variant="ghost" onClick={onOrdersClick}>
                <Package className="w-4 h-4 mr-2" />
                My Orders
              </Button>
            )}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <div className="text-sm">
                <p>{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Guest'}</p>
                <p className="text-muted-foreground text-xs">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main navigation */}
        <div className="flex items-center gap-4 py-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={onCartClick}
          >
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {itemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
