import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Product, PackagingType } from '../types';
import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useCart } from '../contexts/CartContext';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const { addItem } = useCart();
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingType>(
    product.packaging[0]?.type || 'SINGLE'
  );

  const getPackagingPrice = () => {
    const pkg = product.packaging.find((p) => p.type === selectedPackaging);
    return pkg ? pkg.pricePerPackage : product.basePrice;
  };

  const getPackagingLabel = (type: PackagingType) => {
    const labels: Record<PackagingType, string> = {
      CARTON: 'Carton',
      BALE: 'Bale',
      SACHET: 'Sachet',
      OUTER: 'Outer',
      SINGLE: 'Single Unit',
    };
    return labels[type];
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, 1, selectedPackaging);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div onClick={onClick}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.featured && (
            <Badge className="absolute top-2 right-2 bg-green-600">Featured</Badge>
          )}
          {product.stock < 50 && (
            <Badge variant="destructive" className="absolute top-2 left-2">
              Low Stock
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="line-clamp-1">{product.name}</h3>
            <p className="text-muted-foreground text-sm line-clamp-2">
              {product.description}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600">KSh {getPackagingPrice().toLocaleString()}</p>
                <p className="text-muted-foreground text-xs">{product.supplierName}</p>
              </div>
              <Badge variant="outline">{product.stock} in stock</Badge>
            </div>
          </div>
        </CardContent>
      </div>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Select value={selectedPackaging} onValueChange={(value) => setSelectedPackaging(value as PackagingType)}>
          <SelectTrigger className="flex-1" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {product.packaging.map((pkg) => (
              <SelectItem key={pkg.type} value={pkg.type}>
                {getPackagingLabel(pkg.type)} ({pkg.unitsPerPackage} units)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" className="bg-green-600 hover:bg-green-700" onClick={handleAddToCart}>
          <Plus className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
