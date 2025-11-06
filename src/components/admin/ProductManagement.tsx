import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { mockProducts, categories } from '../../lib/mock-data';
import { Product } from '../../types';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function ProductManagement() {
  const [products, setProducts] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: 0,
    stock: 0,
    image: '',
    supplierName: '',
  });

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setIsEditMode(false);
    setFormData({
      name: '',
      description: '',
      category: categories[1],
      basePrice: 0,
      stock: 0,
      image: '',
      supplierName: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (product: Product) => {
    setIsEditMode(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      basePrice: product.basePrice,
      stock: product.stock,
      image: product.image,
      supplierName: product.supplierName || '',
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.category || formData.basePrice <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isEditMode && selectedProduct) {
      setProducts(
        products.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                ...formData,
              }
            : p
        )
      );
      toast.success('Product updated successfully');
    } else {
      const newProduct: Product = {
        id: `${products.length + 1}`,
        ...formData,
        packaging: [
          { type: 'CARTON', unitsPerPackage: 12, pricePerPackage: formData.basePrice * 11 },
          { type: 'SINGLE', unitsPerPackage: 1, pricePerPackage: formData.basePrice },
        ],
      };
      setProducts([...products, newProduct]);
      toast.success('Product added successfully');
    }
    setShowDialog(false);
  };

  const handleDelete = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter((p) => p.id !== productId));
      toast.success('Product deleted successfully');
    }
  };

  const lowStockProducts = products.filter((p) => p.stock < 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Product Management</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl">{products.length}</div>
            <p className="text-xs text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl text-green-600">
              {products.filter((p) => p.stock > 100).length}
            </div>
            <p className="text-xs text-muted-foreground">In Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl text-orange-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl text-blue-600">{categories.length - 1}</div>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {product.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>KSh {product.basePrice.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.stock > 100 ? 'default' : 'destructive'}
                        className={product.stock > 100 ? 'bg-green-600' : ''}
                      >
                        {product.stock} units
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{product.supplierName || 'N/A'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update product information' : 'Add a new product to your inventory'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (KSh) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: Number(e.target.value) })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier Name</Label>
              <Input
                id="supplier"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="Enter supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              {isEditMode ? 'Update Product' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
