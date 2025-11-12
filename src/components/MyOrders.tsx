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
import { Sale } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function MyOrders() {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);

  // Filter orders for current user
  const userOrders = mockOrders.filter((order) => order.userId === user?.id);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      SHIPPED: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const getStatusIcon = (status: string) => {
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

  const getStatusProgress = (status: string) => {
    const progress: Record<string, number> = {
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
                    {/* Order Progress */}
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

                    {/* Items */}
                    <div className="space-y-3 mb-4">
                      {order.items.slice(0, 2).map((item: any, idx: number) => (
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

                    {/* Order Summary */}
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

                    {/* Actions */}
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

        {/* Order Details Dialog */}
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

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Status */}
                <div>
                  <h4 className="mb-2">Order Status</h4>
                  <Badge className={getStatusColor(selectedOrder.status) + ' text-base py-2 px-4'}>
                    {getStatusIcon(selectedOrder.status)}
                    <span className="ml-2">{selectedOrder.status}</span>
                  </Badge>
                  {selectedOrder.status !== 'CANCELLED' && (
                    <div className="mt-4">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${getStatusProgress(selectedOrder.status)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Information */}
                <div>
                  <h4 className="mb-2">Delivery Information</h4>
                  <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Address:</span>{' '}
                      {selectedOrder.deliveryAddress.streetAddress}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Town:</span>{' '}
                      {selectedOrder.deliveryAddress.town}
                    </p>
                    <p>
                      <span className="text-muted-foreground">County:</span>{' '}
                      {selectedOrder.deliveryAddress.county}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phone:</span>{' '}
                      {selectedOrder.deliveryAddress.phone}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="mb-2">Order Items</h4>
                  <div className="border rounded-lg divide-y">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center">
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
                  </div>
                </div>

                {/* Payment Summary */}
                <div>
                  <h4 className="mb-2">Payment Summary</h4>
                  <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>KSh {selectedOrder.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT (16%)</span>
                      <span>KSh {selectedOrder.vat.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>KSh {selectedOrder.deliveryFee.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between pt-2">
                      <span>Total</span>
                      <span className="text-green-600">
                        KSh {selectedOrder.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Payment Method</span>
                      <Badge variant="outline">{selectedOrder.paymentMethod}</Badge>
                    </div>
                    {selectedOrder.mpesaTransactionCode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">M-Pesa Code</span>
                        <span>{selectedOrder.mpesaTransactionCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
