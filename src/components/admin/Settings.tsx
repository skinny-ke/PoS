import { useState } from 'react';
import { Save, Building2, MapPin, Phone, Mail, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

export function Settings() {
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Murimi-Wholesalers',
    kraPin: 'P051234567X',
    email: 'info@murimi-wholesalers.co.ke',
    phone: '+254 700 123 456',
    address: 'Nairobi, Kenya',
    vatRate: 16,
  });

  const [notifications, setNotifications] = useState({
    lowStockAlerts: true,
    orderNotifications: true,
    paymentConfirmations: true,
    emailReports: false,
  });

  const [deliverySettings, setDeliverySettings] = useState({
    standardFee: 500,
    expressMultiplier: 2,
    freeDeliveryThreshold: 50000,
  });

  const handleSaveBusinessInfo = () => {
    toast.success('Business information updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification settings updated successfully');
  };

  const handleSaveDelivery = () => {
    toast.success('Delivery settings updated successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-muted-foreground">Configure your application settings</p>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            Update your business details and KRA information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessInfo.name}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kraPin">KRA PIN</Label>
              <Input
                id="kraPin"
                value={businessInfo.kraPin}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, kraPin: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={businessInfo.email}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </Label>
              <Input
                id="phone"
                value={businessInfo.phone}
                onChange={(e) =>
                  setBusinessInfo({ ...businessInfo, phone: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              <MapPin className="w-4 h-4 inline mr-2" />
              Business Address
            </Label>
            <Textarea
              id="address"
              value={businessInfo.address}
              onChange={(e) =>
                setBusinessInfo({ ...businessInfo, address: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vatRate">
              <Percent className="w-4 h-4 inline mr-2" />
              VAT Rate (%)
            </Label>
            <Input
              id="vatRate"
              type="number"
              value={businessInfo.vatRate}
              onChange={(e) =>
                setBusinessInfo({ ...businessInfo, vatRate: Number(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              Current Kenya VAT rate is 16%
            </p>
          </div>

          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSaveBusinessInfo}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Business Information
          </Button>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Settings</CardTitle>
          <CardDescription>Configure delivery fees and thresholds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="standardFee">Standard Delivery Fee (KSh)</Label>
              <Input
                id="standardFee"
                type="number"
                value={deliverySettings.standardFee}
                onChange={(e) =>
                  setDeliverySettings({
                    ...deliverySettings,
                    standardFee: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expressMultiplier">Express Multiplier</Label>
              <Input
                id="expressMultiplier"
                type="number"
                step="0.1"
                value={deliverySettings.expressMultiplier}
                onChange={(e) =>
                  setDeliverySettings({
                    ...deliverySettings,
                    expressMultiplier: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeDelivery">Free Delivery Threshold (KSh)</Label>
              <Input
                id="freeDelivery"
                type="number"
                value={deliverySettings.freeDeliveryThreshold}
                onChange={(e) =>
                  setDeliverySettings({
                    ...deliverySettings,
                    freeDeliveryThreshold: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg text-sm">
            <p>
              <strong>Standard delivery:</strong> KSh{' '}
              {deliverySettings.standardFee.toLocaleString()}
            </p>
            <p>
              <strong>Express delivery:</strong> KSh{' '}
              {(deliverySettings.standardFee * deliverySettings.expressMultiplier).toLocaleString()}
            </p>
            <p>
              <strong>Free delivery:</strong> Orders above KSh{' '}
              {deliverySettings.freeDeliveryThreshold.toLocaleString()}
            </p>
          </div>

          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSaveDelivery}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Delivery Settings
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Manage system notifications and alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Low Stock Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when products are running low
              </p>
            </div>
            <Switch
              checked={notifications.lowStockAlerts}
              onCheckedChange={(checked: boolean) =>
                setNotifications({ ...notifications, lowStockAlerts: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Order Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts for new orders
              </p>
            </div>
            <Switch
              checked={notifications.orderNotifications}
              onCheckedChange={(checked: boolean) =>
                setNotifications({ ...notifications, orderNotifications: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Payment Confirmations</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when payments are received
              </p>
            </div>
            <Switch
              checked={notifications.paymentConfirmations}
              onCheckedChange={(checked: boolean) =>
                setNotifications({ ...notifications, paymentConfirmations: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Reports</Label>
              <p className="text-sm text-muted-foreground">
                Receive daily/weekly email reports
              </p>
            </div>
            <Switch
              checked={notifications.emailReports}
              onCheckedChange={(checked: boolean) =>
                setNotifications({ ...notifications, emailReports: checked })
              }
            />
          </div>

          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSaveNotifications}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Notification Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
