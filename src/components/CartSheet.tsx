import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { useCart } from '../contexts/CartContext';
import { ScrollArea } from './ui/scroll-area';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}

export function CartSheet({ open, onOpenChange, onCheckout }: CartSheetProps) {
  const { items, removeItem, updateQuantity, subtotal, vat, total, clearCart } = useCart();

  const getPackagingLabel = (type: string) => {
    const labels: Record<string, string> = {
      CARTON: 'Carton',
      BALE: 'Bale',
      SACHET: 'Sachet',
      OUTER: 'Outer',
      SINGLE: 'Single',
    };
    return labels[type] || type;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {items.length === 0 ? 'Your cart is empty' : `${items.length} item(s) in cart`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
            <h3>Your cart is empty</h3>
            <p className="text-muted-foreground mt-2">
              Add products to get started
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div
                    key={`${item.product.id}-${item.packagingType}`}
                    className="flex gap-4 p-4 border rounded-lg"
                  >
                    <div className="w-20 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                      <ImageWithFallback
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="line-clamp-1">{item.product.name}</h4>
                      <Badge variant="secondary" className="mt-1">
                        {getPackagingLabel(item.packagingType)}
                      </Badge>
                      <p className="mt-2 text-green-600">
                        KSh {(item.pricePerUnit * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(item.product.id, item.packagingType)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.packagingType,
                              item.quantity - 1
                            )
                          }
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.packagingType,
                              item.quantity + 1
                            )
                          }
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (16%)</span>
                  <span>KSh {vat.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="text-green-600">KSh {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={clearCart}>
                  Clear Cart
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={onCheckout}>
                  Checkout
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
