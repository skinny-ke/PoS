import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product, PackagingType } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useCart } from '../contexts/CartContext';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({ product, open, onOpenChange }: ProductDetailModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingType>('SINGLE');

  if (!product) return null;

  const getPackagingPrice = () => {
    const pkg = product.packaging?.find((p) => p.type === selectedPackaging);
    return pkg ? pkg.pricePerPackage : product.basePrice || 0;
  };

  const getPackagingLabel = (type: PackagingType) => {
    const labels: Record<PackagingType, string> = {
      CARTON: 'Carton',
      BALE: 'Bale',
      SACHET: 'Sachet',
      OUTER: 'Outer',
      SINGLE: 'Single Unit',
      SACK: 'Sack',
      CRATE: 'Crate',
    };
    return labels[type];
  };

  const handleAddToCart = () => {
    addItem(product, quantity, selectedPackaging);
    onOpenChange(false);
    setQuantity(1);
  };

  const totalPrice = getPackagingPrice() * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.category?.name}</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
              <ImageWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {product.featured && <Badge className="bg-green-600">Featured Product</Badge>}
          </div>

          <div className="space-y-4">
            <div>
              <h3>Description</h3>
              <p className="text-muted-foreground mt-2">{product.description}</p>
            </div>

            <Separator />

            <div>
              <p className="text-muted-foreground text-sm mb-1">Supplier</p>
              <p>{product.supplierName}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Stock Availability</p>
              <Badge variant={product.stock && product.stock > 50 ? 'default' : 'destructive'}>
                {product.stock} units available
              </Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <label className="text-sm mb-2 block">Packaging Type</label>
                <Select
                  value={selectedPackaging}
                  onValueChange={(value) => setSelectedPackaging(value as PackagingType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {product.packaging?.map((pkg) => (
                      <SelectItem key={pkg.type} value={pkg.type}>
                        {getPackagingLabel(pkg.type)} - {pkg.unitsPerPackage} units (KSh {pkg.pricePerPackage.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm mb-2 block">Quantity</label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(product.stock || 9999, quantity + 1))}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per unit</span>
                <span>KSh {getPackagingPrice().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="text-green-600">KSh {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddToCart}>
              <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
