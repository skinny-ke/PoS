import { PrismaClient, UserRole, VATStatus, PaymentMethod, PaymentStatus, SaleStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clean existing data (optional - remove if you want to keep existing data)
  console.log('🧹 Cleaning existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.offlineSyncQueue.deleteMany()
  await prisma.refund.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.stockEntry.deleteMany()
  await prisma.wholesaleTier.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.user.deleteMany()
  await prisma.settings.deleteMany()

  // Create system settings
  console.log('⚙️ Creating system settings...')
  await prisma.settings.createMany({
    data: [
      { key: 'business_name', value: 'Murimi POS', description: 'Business name for receipts' },
      { key: 'business_address', value: 'Nairobi, Kenya', description: 'Business address' },
      { key: 'business_phone', value: '+254 700 000 000', description: 'Business phone number' },
      { key: 'business_email', value: 'info@murimipos.com', description: 'Business email' },
      { key: 'vat_rate', value: '16', description: 'VAT rate percentage' },
      { key: 'currency', value: 'KES', description: 'Currency code' },
      { key: 'receipt_footer', value: 'Thank you for your business!', description: 'Receipt footer message' }
    ]
  })

  // Create categories
  console.log('📦 Creating categories...')
  const categories = await prisma.category.createMany({
    data: [
      { name: 'Beverages', description: 'Soft drinks, juices, and other beverages' },
      { name: 'Snacks', description: 'Chips, biscuits, and other snacks' },
      { name: 'Fresh Produce', description: 'Fruits and vegetables' },
      { name: 'Dairy', description: 'Milk, cheese, and dairy products' },
      { name: 'Groceries', description: 'Staple food items and cooking ingredients' },
      { name: 'Personal Care', description: 'Toiletries and personal hygiene items' },
      { name: 'Household', description: 'Cleaning supplies and household items' }
    ]
  })

  const categoryRecords = await prisma.category.findMany()

  // Create suppliers
  console.log('🏭 Creating suppliers...')
  const suppliers = await prisma.supplier.createMany({
    data: [
      {
        name: 'Kenya Breweries Limited',
        contactPerson: 'John Kamau',
        email: 'orders@kbl.co.ke',
        phone: '+254 722 123 456',
        address: 'Industrial Area, Nairobi',
        isActive: true
      },
      {
        name: 'East African Breweries',
        contactPerson: 'Mary Wanjiku',
        email: 'procurement@eabl.com',
        phone: '+254 733 987 654',
        address: 'Ruaraka, Nairobi',
        isActive: true
      },
      {
        name: 'Bidco Africa',
        contactPerson: 'Peter Ochieng',
        email: 'orders@bidco.co.ke',
        phone: '+254 722 555 777',
        address: 'Thika Road, Nairobi',
        isActive: true
      },
      {
        name: 'Unilever Kenya',
        contactPerson: 'Grace Mutua',
        email: 'supply@unilever.com',
        phone: '+254 733 111 222',
        address: 'Mombasa Road, Nairobi',
        isActive: true
      },
      {
        name: 'Kenya Tea Development Agency',
        contactPerson: 'Samuel Kimani',
        email: 'orders@ktda.co.ke',
        phone: '+254 722 333 444',
        address: 'Westlands, Nairobi',
        isActive: true
      }
    ]
  })

  const supplierRecords = await prisma.supplier.findMany()

  // Create products
  console.log('📦 Creating products...')
  const products = [
    // Beverages
    {
      name: 'Coca Cola 500ml',
      description: 'Classic Coca Cola soft drink',
      barcode: '5449000000996',
      sku: 'COKE500',
      categoryId: categoryRecords.find(c => c.name === 'Beverages')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Kenya Breweries Limited')!.id,
      costPrice: 45.00,
      retailPrice: 60.00,
      wholesalePrice: 55.00,
      stockQuantity: 120,
      minStockLevel: 20,
      maxStockLevel: 200,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    },
    {
      name: 'Fanta Orange 500ml',
      description: 'Orange flavored soft drink',
      barcode: '5449000001009',
      sku: 'FAN500',
      categoryId: categoryRecords.find(c => c.name === 'Beverages')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Kenya Breweries Limited')!.id,
      costPrice: 45.00,
      retailPrice: 60.00,
      wholesalePrice: 55.00,
      stockQuantity: 80,
      minStockLevel: 15,
      maxStockLevel: 150,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    },
    {
      name: 'Tusker Malt 500ml',
      description: 'Premium beer',
      barcode: '5449000002006',
      sku: 'TUSK500',
      categoryId: categoryRecords.find(c => c.name === 'Beverages')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Kenya Breweries Limited')!.id,
      costPrice: 120.00,
      retailPrice: 150.00,
      wholesalePrice: 140.00,
      stockQuantity: 60,
      minStockLevel: 10,
      maxStockLevel: 100,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    },
    // Snacks
    {
      name: 'Cheetos Cheese Snacks 50g',
      description: 'Crunchy cheese flavored snacks',
      barcode: '5010139101234',
      sku: 'CHEETOS50',
      categoryId: categoryRecords.find(c => c.name === 'Snacks')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Bidco Africa')!.id,
      costPrice: 35.00,
      retailPrice: 50.00,
      wholesalePrice: 45.00,
      stockQuantity: 200,
      minStockLevel: 30,
      maxStockLevel: 300,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    },
    {
      name: 'Biscuit Mcvitie\'s 200g',
      description: 'Digestive biscuits',
      barcode: '5000165012345',
      sku: 'MCV200',
      categoryId: categoryRecords.find(c => c.name === 'Snacks')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Bidco Africa')!.id,
      costPrice: 80.00,
      retailPrice: 120.00,
      wholesalePrice: 110.00,
      stockQuantity: 50,
      minStockLevel: 10,
      maxStockLevel: 80,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    },
    // Groceries
    {
      name: 'Maize Flour 1kg',
      description: 'Fine maize flour for ugali',
      barcode: '5012345678901',
      sku: 'MAIZE1KG',
      categoryId: categoryRecords.find(c => c.name === 'Groceries')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Kenya Tea Development Agency')!.id,
      costPrice: 80.00,
      retailPrice: 120.00,
      wholesalePrice: 110.00,
      stockQuantity: 100,
      minStockLevel: 20,
      maxStockLevel: 150,
      vatStatus: VATStatus.NONE,
      isActive: true
    },
    {
      name: 'Sugar 1kg',
      description: 'White granulated sugar',
      barcode: '5012345678902',
      sku: 'SUGAR1KG',
      categoryId: categoryRecords.find(c => c.name === 'Groceries')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Kenya Tea Development Agency')!.id,
      costPrice: 130.00,
      retailPrice: 160.00,
      wholesalePrice: 150.00,
      stockQuantity: 80,
      minStockLevel: 15,
      maxStockLevel: 120,
      vatStatus: VATStatus.NONE,
      isActive: true
    },
    {
      name: 'Cooking Oil 1L',
      description: 'Refined sunflower oil',
      barcode: '5012345678903',
      sku: 'OIL1L',
      categoryId: categoryRecords.find(c => c.name === 'Groceries')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Bidco Africa')!.id,
      costPrice: 180.00,
      retailPrice: 220.00,
      wholesalePrice: 200.00,
      stockQuantity: 60,
      minStockLevel: 12,
      maxStockLevel: 100,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    },
    // Personal Care
    {
      name: 'Soap Bar 125g',
      description: 'Antibacterial soap bar',
      barcode: '5000123456789',
      sku: 'SOAP125',
      categoryId: categoryRecords.find(c => c.name === 'Personal Care')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Unilever Kenya')!.id,
      costPrice: 25.00,
      retailPrice: 40.00,
      wholesalePrice: 35.00,
      stockQuantity: 150,
      minStockLevel: 25,
      maxStockLevel: 250,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    },
    {
      name: 'Toothpaste 75g',
      description: 'Fluoride toothpaste',
      barcode: '5000123456790',
      sku: 'TOOTH75',
      categoryId: categoryRecords.find(c => c.name === 'Personal Care')!.id,
      supplierId: supplierRecords.find(s => s.name === 'Unilever Kenya')!.id,
      costPrice: 45.00,
      retailPrice: 70.00,
      wholesalePrice: 60.00,
      stockQuantity: 90,
      minStockLevel: 15,
      maxStockLevel: 150,
      vatStatus: VATStatus.INCLUSIVE,
      isActive: true
    }
  ]

  const createdProducts = await Promise.all(
    products.map(product => prisma.product.create({ data: product }))
  )

  // Create wholesale tiers for products
  console.log('💰 Creating wholesale tiers...')
  await Promise.all(
    createdProducts.map(async (product) => {
      if (['Coca Cola 500ml', 'Fanta Orange 500ml', 'Cheetos Cheese Snacks 50g'].includes(product.name)) {
        await prisma.wholesaleTier.createMany({
          data: [
            {
              productId: product.id,
              minQuantity: 5,
              maxQuantity: 11,
              price: Number(product.wholesalePrice),
              isActive: true
            },
            {
              productId: product.id,
              minQuantity: 12,
              maxQuantity: 24,
              price: Number(product.wholesalePrice) - 2,
              isActive: true
            },
            {
              productId: product.id,
              minQuantity: 25,
              price: Number(product.wholesalePrice) - 5,
              isActive: true
            }
          ]
        })
      }
    })
  )

  // Create initial stock entries
  console.log('📦 Creating stock entries...')
  for (const product of createdProducts) {
    await prisma.stockEntry.create({
      data: {
        productId: product.id,
        quantity: product.stockQuantity,
        costPrice: Number(product.costPrice),
        totalCost: Number(product.costPrice) * product.stockQuantity,
        supplierId: product.supplierId,
        userId: await getSystemUserId(),
        referenceNumber: 'INITIAL_STOCK',
        notes: 'Initial stock entry from seeding'
      }
    })
  }

  // Create sample users (this would normally use Clerk, but for seeding we'll create local records)
  console.log('👥 Creating sample users...')
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@murimipos.com' },
    update: {},
    create: {
      clerkId: 'admin_clerk_id',
      email: 'admin@murimipos.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true
    }
  })

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@murimipos.com' },
    update: {},
    create: {
      clerkId: 'manager_clerk_id',
      email: 'manager@murimipos.com',
      firstName: 'Store',
      lastName: 'Manager',
      role: UserRole.MANAGER,
      isActive: true
    }
  })

  const cashierUser = await prisma.user.upsert({
    where: { email: 'cashier@murimipos.com' },
    update: {},
    create: {
      clerkId: 'cashier_clerk_id',
      email: 'cashier@murimipos.com',
      firstName: 'Front',
      lastName: 'Cashier',
      role: UserRole.CASHIER,
      isActive: true
    }
  })

  // Create sample sales data
  console.log('💰 Creating sample sales...')
  const sampleSales = [
    {
      saleNumber: 'SALE-001',
      userId: cashierUser.id,
      totalAmount: 310.00,
      subtotalAmount: 310.00,
      discountAmount: 0,
      taxAmount: 0,
      paidAmount: 310.00,
      changeAmount: 0,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.COMPLETED,
      status: SaleStatus.COMPLETED,
      customerName: 'John Doe',
      customerPhone: '+254712345678',
      receiptPrinted: true,
      saleItems: {
        create: [
          {
            productId: createdProducts.find(p => p.name === 'Coca Cola 500ml')!.id,
            quantity: 2,
            unitPrice: 60.00,
            totalPrice: 120.00,
            discountAmount: 0,
            taxAmount: 0
          },
          {
            productId: createdProducts.find(p => p.name === 'Cheetos Cheese Snacks 50g')!.id,
            quantity: 3,
            unitPrice: 50.00,
            totalPrice: 150.00,
            discountAmount: 0,
            taxAmount: 0
          },
          {
            productId: createdProducts.find(p => p.name === 'Maize Flour 1kg')!.id,
            quantity: 1,
            unitPrice: 120.00,
            totalPrice: 120.00,
            discountAmount: 0,
            taxAmount: 0
          }
        ]
      }
    },
    {
      saleNumber: 'SALE-002',
      userId: cashierUser.id,
      totalAmount: 190.00,
      subtotalAmount: 190.00,
      discountAmount: 10.00,
      taxAmount: 0,
      paidAmount: 200.00,
      changeAmount: 10.00,
      paymentMethod: PaymentMethod.MPESA,
      paymentStatus: PaymentStatus.COMPLETED,
      status: SaleStatus.COMPLETED,
      customerName: 'Jane Smith',
      customerPhone: '+254723456789',
      receiptPrinted: true,
      saleItems: {
        create: [
          {
            productId: createdProducts.find(p => p.name === 'Fanta Orange 500ml')!.id,
            quantity: 1,
            unitPrice: 60.00,
            totalPrice: 60.00,
            discountAmount: 0,
            taxAmount: 0
          },
          {
            productId: createdProducts.find(p => p.name === 'Sugar 1kg')!.id,
            quantity: 1,
            unitPrice: 160.00,
            totalPrice: 160.00,
            discountAmount: 10.00,
            taxAmount: 0
          }
        ]
      }
    }
  ]

  for (const saleData of sampleSales) {
    const sale = await prisma.sale.create({ data: saleData })
    
    // Create payment records
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        amount: sale.totalAmount,
        method: sale.paymentMethod as any,
        status: 'COMPLETED',
        reference: sale.paymentMethod === 'MPESA' ? 'MPE123456789' : null
      }
    })

    // Update product stock
    for (const item of saleData.saleItems.create) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity
          }
        }
      })
    }
  }

  console.log('✅ Database seeding completed successfully!')
  console.log(`
📊 Summary:
- Categories: ${categoryRecords.length}
- Suppliers: ${supplierRecords.length}  
- Products: ${createdProducts.length}
- Users: 3 (Admin, Manager, Cashier)
- Sample Sales: 2
- Settings: 7

🔑 Default Login Credentials (for Clerk):
- Admin: admin@murimipos.com
- Manager: manager@murimipos.com
- Cashier: cashier@murimipos.com

💡 Note: You'll need to set up these users in Clerk authentication.
`)
}

async function getSystemUserId(): Promise<string> {
  let systemUser = await prisma.user.findFirst({
    where: { email: 'system@murimipos.com' }
  })

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        clerkId: 'system-offline',
        email: 'system@murimipos.com',
        firstName: 'System',
        lastName: 'Offline',
        role: 'ADMIN',
        isActive: true
      }
    })
  }

  return systemUser.id
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })