import { useState } from 'react';
import { Search, Plus, Minus, Trash2, Smartphone, Wallet, CreditCard, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { mockProducts } from '../../lib/mock-data';
import { Product, PaymentMethod, VAT_RATE } from '../../types';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface POSItem {
  product: Product;
  quantity: number;
  price: number;
}

export function PointOfSale() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<POSItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [cashReceived, setCashReceived] = useState('');

  const filteredProducts = mockProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { product, quantity: 1, price: product.basePrice || product.retailPrice }]);
    }
    toast.success('Added to cart');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
    toast.success('Removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowCheckout(true);
  };

  const completeSale = () => {
    if (paymentMethod === 'CASH') {
      const received = parseFloat(cashReceived);
      if (isNaN(received) || received < total) {
        toast.error('Insufficient cash amount');
        return;
      }
    }

    const receipt = {
      id: `POS-${Date.now()}`,
      date: new Date(),
      items: cart,
      subtotal,
      vat,
      total,
      paymentMethod,
      cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : total,
      change: paymentMethod === 'CASH' ? parseFloat(cashReceived) - total : 0,
    };

    setReceiptData(receipt);
    setShowCheckout(false);
    setShowReceipt(true);
    setCart([]);
    setCashReceived('');
    toast.success('Sale completed successfully!');
  };

  const printReceipt = () => {
    window.print();
    setShowReceipt(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Point of Sale</h1>
        <p className="text-muted-foreground">Fast checkout for in-store purchases</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products or scan barcode..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="aspect-square w-full mb-2 rounded overflow-hidden bg-muted">
                      <ImageWithFallback
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm line-clamp-1">{product.name}</p>
                    <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                    <p className="text-sm text-green-600 mt-1">
                      KSh {(product.basePrice || product.retailPrice).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Sale</CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Cart is empty</p>
                  <p className="text-sm mt-1">Add products to start sale</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex gap-2 p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            KSh {item.price.toLocaleString()} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>KSh {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT (16%)</span>
                      <span>KSh {vat.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span>Total</span>
                      <span className="text-green-600">KSh {total.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    onClick={handleCheckout}
                  >
                    Checkout
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl text-green-600">KSh {total.toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v: string) => setPaymentMethod(v as PaymentMethod)}>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="CASH" id="pos-cash" />
                  <Label htmlFor="pos-cash" className="flex-1 cursor-pointer flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Cash
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="MPESA" id="pos-mpesa" />
                  <Label htmlFor="pos-mpesa" className="flex-1 cursor-pointer flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    M-Pesa
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="CARD" id="pos-card" />
                  <Label htmlFor="pos-card" className="flex-1 cursor-pointer flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-2">
                <Label htmlFor="cash-received">Cash Received</Label>
                <Input
                  id="cash-received"
                  type="number"
                  placeholder="Enter amount received"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  autoFocus
                />
                {cashReceived && parseFloat(cashReceived) >= total && (
                  <p className="text-sm text-green-600">
                    Change: KSh {(parseFloat(cashReceived) - total).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={completeSale}>
                Complete Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Receipt</DialogTitle>
          </DialogHeader>

          {receiptData && (
            <div className="space-y-4" id="receipt-content">
              <div className="text-center border-b pb-4">
                <h3>Murimi-Wholesalers</h3>
                <p className="text-sm text-muted-foreground">Nairobi, Kenya</p>
                <p className="text-sm text-muted-foreground">Tel: +254 700 123 456</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {receiptData.date.toLocaleString('en-GB')}
                </p>
                <p className="text-xs text-muted-foreground">Receipt: {receiptData.id}</p>
              </div>

              <div className="space-y-2 text-sm">
                {receiptData.items.map((item: POSItem, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.product.name} x{item.quantity}
                    </span>
                    <span>KSh {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>KSh {receiptData.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (16%)</span>
                  <span>KSh {receiptData.vat.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>KSh {receiptData.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span>{receiptData.paymentMethod}</span>
                </div>
                {receiptData.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between">
                      <span>Cash Received</span>
                      <span>KSh {receiptData.cashReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change</span>
                      <span>KSh {receiptData.change.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>Thank you for your business!</p>
                <p>VAT Reg: P051234567X</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(false)}>
                  Close
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={printReceipt}>
                  <Receipt className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
