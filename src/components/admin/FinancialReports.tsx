import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { mockOrders, mockSalesData, mockProductPerformance } from '../../lib/admin-mock-data';
import { VAT_RATE } from '../../types';
import { toast } from 'sonner';

export function FinancialReports() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Calculate financial metrics
  const totalRevenue = mockOrders.reduce((sum, order) => sum + order.total, 0);
  const totalSubtotal = mockOrders.reduce((sum, order) => sum + order.subtotal, 0);
  const totalVAT = mockOrders.reduce((sum, order) => sum + order.vat, 0);
  const totalDeliveryFees = mockOrders.reduce((sum, order) => sum + order.deliveryFee, 0);

  // Profit calculation (15% profit margin assumed)
  const profitMargin = 0.15;
  const costOfGoods = totalSubtotal * (1 - profitMargin);
  const grossProfit = totalSubtotal - costOfGoods;
  const netProfit = grossProfit - (totalRevenue * 0.05); // 5% operating expenses

  // Revenue by payment method
  const revenueByPayment = [
    {
      name: 'M-Pesa',
      value: mockOrders
        .filter((o) => o.paymentMethod === 'MPESA')
        .reduce((sum, o) => sum + o.total, 0),
      color: '#16a34a',
    },
    {
      name: 'Cash',
      value: mockOrders
        .filter((o) => o.paymentMethod === 'CASH')
        .reduce((sum, o) => sum + o.total, 0),
      color: '#ea580c',
    },
    {
      name: 'Card',
      value: mockOrders
        .filter((o) => o.paymentMethod === 'CARD')
        .reduce((sum, o) => sum + o.total, 0),
      color: '#2563eb',
    },
  ];

  // Profit & Loss data
  const profitLossData = [
    { category: 'Revenue', amount: totalRevenue, type: 'income' },
    { category: 'Cost of Goods', amount: costOfGoods, type: 'expense' },
    { category: 'Gross Profit', amount: grossProfit, type: 'income' },
    { category: 'Operating Expenses', amount: totalRevenue * 0.05, type: 'expense' },
    { category: 'Net Profit', amount: netProfit, type: 'income' },
  ];

  // VAT breakdown
  const vatBreakdown = [
    { description: 'VAT Collected (Sales)', amount: totalVAT },
    { description: 'VAT Paid (Purchases)', amount: totalVAT * 0.3 }, // Estimated
    { description: 'Net VAT Payable', amount: totalVAT * 0.7 },
  ];

  const handleExportPDF = () => {
    toast.success('Financial report exported as PDF');
  };

  const handleExportExcel = () => {
    toast.success('Financial report exported as Excel');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Financial Reports</h1>
          <p className="text-muted-foreground">View detailed financial analytics and reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">KSh {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-green-600">+12.5%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Gross Profit</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">KSh {grossProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Margin: {(profitMargin * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Net Profit</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">
              KSh {netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              After expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">VAT Collected</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">KSh {totalVAT.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">16% of sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })
                  }
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `KSh ${value.toLocaleString()}`}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-GB')}
                />
                <Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
            <CardDescription>Distribution of payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByPayment}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: KSh ${entry.value.toLocaleString()}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueByPayment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `KSh ${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Loss Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
          <CardDescription>Financial performance summary</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount (KSh)</TableHead>
                <TableHead className="text-right">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitLossData.map((item, idx) => (
                <TableRow key={idx} className={item.category.includes('Net') ? 'border-t-2' : ''}>
                  <TableCell className={item.category.includes('Net') ? 'font-bold' : ''}>
                    {item.category}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      item.type === 'income' ? 'text-green-600' : 'text-red-600'
                    } ${item.category.includes('Net') ? 'font-bold' : ''}`}
                  >
                    {item.type === 'expense' && '-'}
                    {item.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.type === 'income' ? 'default' : 'destructive'}>
                      {item.type}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VAT Report */}
      <Card>
        <CardHeader>
          <CardTitle>VAT Report (16%)</CardTitle>
          <CardDescription>Value Added Tax breakdown for KRA compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vatBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center p-4 rounded-lg ${
                  item.description.includes('Net') ? 'bg-green-50 border border-green-200' : 'bg-muted'
                }`}
              >
                <span className={item.description.includes('Net') ? 'font-bold' : ''}>
                  {item.description}
                </span>
                <span
                  className={`${
                    item.description.includes('Net') ? 'text-green-600 font-bold text-lg' : ''
                  }`}
                >
                  KSh {item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-blue-900 mb-2">KRA Tax Obligation</h4>
            <p className="text-sm text-blue-800">
              Net VAT payable to Kenya Revenue Authority:{' '}
              <span className="font-bold">KSh {(totalVAT * 0.7).toLocaleString()}</span>
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Due date: 20th of next month. Ensure timely filing to avoid penalties.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top Products by Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products by Revenue</CardTitle>
          <CardDescription>Best performing products</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProductPerformance.map((product, idx) => (
                <TableRow key={idx}>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell className="text-right">{product.unitsSold}</TableCell>
                  <TableCell className="text-right">
                    KSh {product.revenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    KSh {product.profit.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
