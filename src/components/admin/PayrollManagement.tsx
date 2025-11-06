import { useState } from 'react';
import { Search, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { mockPayroll, PayrollRecord } from '../../lib/admin-mock-data';
import { toast } from 'sonner@2.0.3';

export function PayrollManagement() {
  const [payrollRecords, setPayrollRecords] = useState(mockPayroll);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  const filteredRecords = payrollRecords.filter((record) => {
    const matchesSearch = record.employeeName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePaySalary = (recordId: string) => {
    setPayrollRecords(
      payrollRecords.map((record) =>
        record.id === recordId
          ? { ...record, status: 'PAID', paidDate: new Date() }
          : record
      )
    );
    toast.success('Salary marked as paid');
  };

  const totalPending = payrollRecords
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.netSalary, 0);

  const totalPaid = payrollRecords
    .filter((r) => r.status === 'PAID')
    .reduce((sum, r) => sum + r.netSalary, 0);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1>Payroll Management</h1>
        <p className="text-muted-foreground">
          Manage employee salaries and payments for {currentMonth} {currentYear}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl">
              KSh {(totalPending + totalPaid).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Payroll</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl text-orange-600">KSh {totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl text-green-600">KSh {totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl">{payrollRecords.length}</div>
            <p className="text-xs text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'ALL' | 'PENDING' | 'PAID')}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Basic Salary</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No payroll records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.id}</TableCell>
                    <TableCell>{record.employeeName}</TableCell>
                    <TableCell>
                      {record.month} {record.year}
                    </TableCell>
                    <TableCell className="text-right">
                      KSh {record.basicSalary.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      +{record.allowances.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{record.deductions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      KSh {record.netSalary.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.status === 'PAID' ? 'default' : 'secondary'}
                        className={record.status === 'PAID' ? 'bg-green-600' : ''}
                      >
                        {record.status === 'PAID' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.status === 'PENDING' ? (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handlePaySalary(record.id)}
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          Pay
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Paid on {record.paidDate?.toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payroll Summary */}
      <Card>
        <CardHeader>
          <h3>Payroll Summary - {currentMonth} {currentYear}</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>Total Basic Salaries</span>
              <span>
                KSh{' '}
                {payrollRecords
                  .reduce((sum, r) => sum + r.basicSalary, 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-green-600">Total Allowances</span>
              <span className="text-green-600">
                +KSh{' '}
                {payrollRecords
                  .reduce((sum, r) => sum + r.allowances, 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-red-600">Total Deductions (NSSF, NHIF, PAYE)</span>
              <span className="text-red-600">
                -KSh{' '}
                {payrollRecords
                  .reduce((sum, r) => sum + r.deductions, 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <span className="font-bold">Total Net Payroll</span>
              <span className="font-bold text-green-600 text-lg">
                KSh {(totalPending + totalPaid).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
