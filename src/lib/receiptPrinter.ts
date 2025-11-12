// Receipt printer utilities
export interface ReceiptData {
  saleNumber: string
  cashierName: string
  customerName?: string
  customerPhone?: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: string
  date: string
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  mpesaReceipt?: string
}

export function printReceipt(receiptData: ReceiptData): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // Check if browser supports Web Printing API
      if ('print' in window) {
        // Generate HTML for receipt
        const receiptHTML = generateReceiptHTML(receiptData)
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=300,height=600')
        if (!printWindow) {
          reject(new Error('Popup blocked. Please allow popups for this site.'))
          return
        }

        printWindow.document.write(receiptHTML)
        printWindow.document.close()

        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
            resolve(true)
          }, 500)
        }

        printWindow.onerror = () => {
          reject(new Error('Failed to load print window'))
        }
      } else {
        // Fallback: download as text file
        const receiptText = generateReceiptText(receiptData)
        const blob = new Blob([receiptText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt-${receiptData.saleNumber}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        resolve(true)
      }
    } catch (error) {
      reject(error)
    }
  })
}

export function printFromServer(saleId: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`/api/sales/${saleId}/receipt`)
      if (!response.ok) {
        throw new Error('Failed to fetch receipt data')
      }
      
      const { data: receiptData } = await response.json()
      await printReceipt(receiptData)
      resolve(true)
    } catch (error) {
      reject(error)
    }
  })
}

function generateReceiptHTML(data: ReceiptData): string {
  const businessName = data.businessName || 'Murimi POS'
  const businessAddress = data.businessAddress || 'Nairobi, Kenya'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${data.saleNumber}</title>
      <style>
        @page { 
          size: 58mm auto; 
          margin: 0; 
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 8px;
          line-height: 1.2;
          margin: 0;
          padding: 5px;
          width: 48mm;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-bottom: 1px dashed #000; margin: 5px 0; }
        .item-row { display: flex; justify-content: space-between; }
        .item-name { flex: 1; margin-right: 5px; }
        .item-qty { width: 20px; text-align: center; }
        .item-price { width: 35px; text-align: right; }
        .item-total { width: 35px; text-align: right; }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          font-weight: bold;
        }
        .footer { text-align: center; margin-top: 10px; font-size: 7px; }
      </style>
    </head>
    <body>
      <div class="center bold">${businessName}</div>
      <div class="center">${businessAddress}</div>
      <div class="center">Tel: +254 700 000 000</div>
      <div class="line"></div>
      
      <div>Receipt: ${data.saleNumber}</div>
      <div>Date: ${new Date(data.date).toLocaleString('en-KE')}</div>
      <div>Cashier: ${data.cashierName}</div>
      ${data.customerName ? `<div>Customer: ${data.customerName}</div>` : ''}
      ${data.customerPhone ? `<div>Phone: ${data.customerPhone}</div>` : ''}
      <div class="line"></div>
      
      ${data.items.map(item => `
        <div class="item-row">
          <div class="item-name">${item.name}</div>
        </div>
        <div class="item-row">
          <div class="item-qty">${item.quantity}x</div>
          <div class="item-price">${item.unitPrice.toFixed(2)}</div>
          <div class="item-total">${item.totalPrice.toFixed(2)}</div>
        </div>
      `).join('')}
      
      <div class="line"></div>
      
      <div class="total-row">
        <span>Subtotal:</span>
        <span>KSh ${data.subtotal.toFixed(2)}</span>
      </div>
      
      ${data.discount > 0 ? `
        <div class="total-row">
          <span>Discount:</span>
          <span>-KSh ${data.discount.toFixed(2)}</span>
        </div>
      ` : ''}
      
      ${data.tax > 0 ? `
        <div class="total-row">
          <span>VAT (16%):</span>
          <span>KSh ${data.tax.toFixed(2)}</span>
        </div>
      ` : ''}
      
      <div class="line"></div>
      
      <div class="total-row bold">
        <span>TOTAL:</span>
        <span>KSh ${data.total.toFixed(2)}</span>
      </div>
      
      <div>Payment: ${data.paymentMethod}</div>
      ${data.mpesaReceipt ? `<div>MPESA: ${data.mpesaReceipt}</div>` : ''}
      
      <div class="line"></div>
      
      <div class="footer">
        <p>THANK YOU FOR YOUR BUSINESS!</p>
        <p>Goods sold are not returnable</p>
        <p>Visit us again soon</p>
        <p>${new Date().getFullYear()} ${businessName}</p>
      </div>
    </body>
    </html>
  `
}

function generateReceiptText(data: ReceiptData): string {
  const businessName = data.businessName || 'Murimi POS'
  const businessAddress = data.businessAddress || 'Nairobi, Kenya'
  
  let receipt = ''
  receipt += `${businessName}\n`
  receipt += `${businessAddress}\n`
  receipt += `Tel: +254 700 000 000\n`
  receipt += `${'='.repeat(32)}\n`
  receipt += `Receipt: ${data.saleNumber}\n`
  receipt += `Date: ${new Date(data.date).toLocaleString('en-KE')}\n`
  receipt += `Cashier: ${data.cashierName}\n`
  if (data.customerName) receipt += `Customer: ${data.customerName}\n`
  if (data.customerPhone) receipt += `Phone: ${data.customerPhone}\n`
  receipt += `${'-'.repeat(32)}\n\n`
  
  // Items
  data.items.forEach(item => {
    receipt += `${item.name}\n`
    receipt += `${item.quantity}x ${item.unitPrice.toFixed(2)} = ${item.totalPrice.toFixed(2)}\n`
  })
  
  receipt += `${'-'.repeat(32)}\n\n`
  receipt += `Subtotal:     KSh ${data.subtotal.toFixed(2)}\n`
  if (data.discount > 0) {
    receipt += `Discount:     -KSh ${data.discount.toFixed(2)}\n`
  }
  if (data.tax > 0) {
    receipt += `VAT (16%):    KSh ${data.tax.toFixed(2)}\n`
  }
  receipt += `${'='.repeat(32)}\n`
  receipt += `TOTAL:        KSh ${data.total.toFixed(2)}\n\n`
  receipt += `Payment: ${data.paymentMethod}\n`
  if (data.mpesaReceipt) {
    receipt += `MPESA: ${data.mpesaReceipt}\n`
  }
  receipt += `${'-'.repeat(32)}\n\n`
  receipt += `THANK YOU FOR YOUR BUSINESS!\n`
  receipt += `Goods sold are not returnable\n`
  receipt += `Visit us again soon\n`
  receipt += `${new Date().getFullYear()} ${businessName}\n`
  
  return receipt
}