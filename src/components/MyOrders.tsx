import { useState } from 'react';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { mockOrders } from '../lib/admin-mock-data';
import { Order } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function MyOrders() {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const userOrders = mockOrders.filter((order) => order.userId === user?.id);

  const getStatusColor = (status: Order['status']) => {
    const colors: Record<Order['status'], string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'CONFIRMED':
      case 'PROCESSING':
        return <Package className="w-4 h-4" />;
      case 'SHIPPED':
        return <Truck className="w-4 h-4" />;
      case 'DELIVERED':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusProgress = (status: Order['status']) => {
    const progress: Record<Order['status'], number> = {
      PENDING: 20,
      CONFIRMED: 40,
      PROCESSING: 60,
      SHIPPED: 80,
      DELIVERED: 100,
      CANCELLED: 0,
    };
    return progress[status];
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1>My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>

        {userOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3>No orders yet</h3>
              <p className="text-muted-foreground mt-2">
                Start shopping to see your orders here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {userOrders
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.id}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Placed on {order.createdAt.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {order.status !== 'CANCELLED' && (
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>Order Progress</span>
                          <span>{getStatusProgress(order.status)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${getStatusProgress(order.status)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-3 mb-4">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.packagingType} × {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm">
                            KSh {(item.pricePerUnit * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.items.length - 2} more item(s)
                        </p>
                      )}
                    </div>
                    <Separator />
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-green-600">KSh {order.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                        <Badge variant="outline">{order.paymentMethod}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Delivery Location</p>
                        <p className="text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.deliveryAddress.town}, {order.deliveryAddress.county}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Details
                      </Button>
                      {order.status === 'DELIVERED' && (
                        <Button className="flex-1 bg-green-600 hover:bg-green-700">
                          Reorder
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Dialog */}
        <Dialog
          open={!!selectedOrder}
          onOpenChange={(open: boolean) => !open && setSelectedOrder(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.id}</DialogTitle>
              <DialogDescription>
                Placed on {selectedOrder?.createdAt.toLocaleDateString('en-GB')}
              </DialogDescription>
            </DialogHeader>
            {/* Additional details here, same as previous code */}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
