import { useState } from 'react';
import { CreditCard, Smartphone, Wallet, MapPin, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { KENYAN_COUNTIES, PaymentMethod } from '../types';
import { toast } from 'sonner@2.0.3';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const { subtotal, vat, total, clearCart, items } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MPESA');
  const [deliveryFee] = useState(500); // Fixed delivery fee for demo
  
  // Form state
  const [county, setCounty] = useState(user?.county || '');
  const [town, setTown] = useState(user?.town || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [mpesaPhone, setMpesaPhone] = useState(user?.mpesaPhone || '');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const finalTotal = total + deliveryFee;
  const selectedCounty = KENYAN_COUNTIES.find((c) => c.name === county);

  const handleDeliverySubmit = () => {
    if (!county || !town || !streetAddress || !phone) {
      toast.error('Please fill in all delivery details');
      return;
    }
    setStep('payment');
  };

  const handlePaymentSubmit = async () => {
    if (paymentMethod === 'MPESA' && !mpesaPhone) {
      toast.error('Please enter your M-Pesa phone number');
      return;
    }

    setStep('processing');

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (paymentMethod === 'MPESA') {
      toast.success('M-Pesa STK push sent! Check your phone to complete payment.');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setStep('success');
    clearCart();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('details');
      setCounty(user?.county || '');
      setTown(user?.town || '');
      setStreetAddress('');
      setAdditionalInfo('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'details' && 'Delivery Details'}
            {step === 'payment' && 'Payment Method'}
            {step === 'processing' && 'Processing Payment'}
            {step === 'success' && 'Order Confirmed!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'details' && 'Enter your delivery information'}
            {step === 'payment' && 'Choose how you want to pay'}
            {step === 'processing' && 'Please wait while we process your order'}
            {step === 'success' && 'Your order has been placed successfully'}
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Select value={county} onValueChange={setCounty}>
                  <SelectTrigger id="county">
                    <SelectValue placeholder="Select county" />
                  </SelectTrigger>
                  <SelectContent>
                    {KENYAN_COUNTIES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="town">Town</Label>
                <Select value={town} onValueChange={setTown} disabled={!county}>
                  <SelectTrigger id="town">
                    <SelectValue placeholder="Select town" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCounty?.towns.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                placeholder="Enter your street address"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+254..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional">Additional Information (Optional)</Label>
              <Textarea
                id="additional"
                placeholder="Building name, floor, landmark, etc."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (16%)</span>
                <span>KSh {vat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>KSh {deliveryFee.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>Total</span>
                <span className="text-green-600">KSh {finalTotal.toLocaleString()}</span>
              </div>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleDeliverySubmit}
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="MPESA" id="mpesa" />
                  <Label htmlFor="mpesa" className="flex-1 cursor-pointer flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    <div>
                      <p>M-Pesa</p>
                      <p className="text-muted-foreground text-sm">Pay via M-Pesa STK Push</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="CASH" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-orange-600" />
                    <div>
                      <p>Cash on Delivery</p>
                      <p className="text-muted-foreground text-sm">Pay when you receive your order</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="CARD" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <p>Credit/Debit Card</p>
                      <p className="text-muted-foreground text-sm">Pay securely with your card</p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {paymentMethod === 'MPESA' && (
              <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 border rounded-md bg-background">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">+254</span>
                  </div>
                  <Input
                    id="mpesa-phone"
                    type="tel"
                    placeholder="712345678"
                    value={mpesaPhone.replace('+254', '').replace('254', '')}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  You'll receive an STK push on this number to complete the payment
                </p>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You will be redirected to a secure payment page to complete your card payment.
                </p>
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Please have the exact amount ready when the delivery arrives. Our driver will collect KSh {finalTotal.toLocaleString()}.
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">
                    {streetAddress}, {town}, {county}
                  </p>
                  <p className="text-sm text-muted-foreground">{phone}</p>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>Total to Pay</span>
                <span className="text-green-600">KSh {finalTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handlePaymentSubmit}
              >
                {paymentMethod === 'MPESA' ? 'Send STK Push' : 'Place Order'}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="mb-2">Processing your order...</h3>
            <p className="text-muted-foreground text-center">
              {paymentMethod === 'MPESA'
                ? 'Please check your phone and enter your M-Pesa PIN'
                : 'Please wait while we confirm your order'}
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="mb-2">Order Placed Successfully!</h3>
            <p className="text-muted-foreground mb-4">
              Your order has been confirmed and will be delivered soon.
            </p>
            <div className="p-4 bg-muted rounded-lg text-left w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span>#MW{Math.floor(Math.random() * 10000)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="text-green-600">KSh {finalTotal.toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full mt-6 bg-green-600 hover:bg-green-700" onClick={handleClose}>
              Continue Shopping
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
