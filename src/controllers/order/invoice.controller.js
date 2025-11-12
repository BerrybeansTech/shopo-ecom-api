const Invoice = require("../../models/orders/invoice.model");
const Orders = require("../../models/orders/order.model");
const Customers = require("../../models/customer/customers.model");
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const getAllInvoices = async (req, res) => {
  const { customerId, page: pageQuery, limit: limitQuery } = req.query;

  const page = parseInt(pageQuery) || 1;
  const limit = parseInt(limitQuery) || 10;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (customerId) whereClause.customerId = customerId;

  const { count, rows } = await Invoice.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Orders,
        as: 'order',
        attributes: ['id', 'totalAmount', 'status', 'createdAt']
      },
      {
        model: Customers,
        as: 'customer',
        attributes: ['id', 'name', 'email', 'phone']
      }
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  });
};

const getInvoiceById = async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findByPk(id, {
    include: [
      {
        model: Orders,
        as: 'order',
        attributes: ['id', 'totalAmount', 'status', 'createdAt', 'orderNote']
      },
      {
        model: Customers,
        as: 'customer',
        attributes: ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postalCode']
      }
    ]
  });

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.status = 404;
    throw error;
  }

  res.json({ success: true, data: invoice });
};

const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { invoiceFile } = req.body;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.status = 404;
    throw error;
  }

  await invoice.update({ invoiceFile });

  res.json({ success: true, message: "Invoice updated successfully" });
};

const deleteInvoice = async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.status = 404;
    throw error;
  }

  // Delete the file from filesystem
  if (invoice.invoiceFile) {
    const invoicesDir = path.join(__dirname, '../../uploads/invoices');
    const filePath = path.join(invoicesDir, invoice.invoiceFile);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await invoice.destroy();

  res.json({
    success: true,
    message: "Invoice deleted successfully",
  });
};

const generateInvoiceHTML = (order, companyInfo) => {
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const invoiceNumber = `${companyInfo.invoicePrefix || 'INV'}/${new Date().getFullYear()}-${String(order.id).padStart(6, '0')}`;

  // Calculate IGST (18% standard rate in India)
  const igstRate = 18;
  const subtotal = order.productInfo?.reduce((sum, item) => sum + (item.total || 0), 0) || order.subTotal || 0;
  const igstAmount = (subtotal * igstRate) / 100;
  const grandTotal = subtotal + igstAmount;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Invoice #${invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            background-color: #ffffff;
            color: #000;
            width: 794px;
            height: 1123px;
        }
        
        .invoice-container {
            width: 100%;
            height: 100%;
            background-color: white;
            border: 2px solid #000;
            position: relative;
        }
        
        .header {
            text-align: center;
            padding: 20px;
            border-bottom: 2px solid #000;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            letter-spacing: 2px;
        }
        
        .company-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 0 20px;
        }
        
        .logo-section {
            flex: 0 0 200px;
        }
        
        .logo-placeholder {
            width: 180px;
            height: 80px;
            background: linear-gradient(135deg, #e74c3c 0%, #e74c3c 50%, #000 50%, #000 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .company-details {
            flex: 1;
            text-align: right;
            font-size: 11px;
            line-height: 1.6;
        }
        
        .company-details strong {
            font-size: 13px;
            display: block;
            margin-bottom: 5px;
        }
        
        .invoice-meta {
            display: table;
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .invoice-meta-row {
            display: table-row;
        }
        
        .invoice-meta-cell {
            display: table-cell;
            padding: 10px 20px;
            border: 1px solid #000;
            font-size: 12px;
        }
        
        .invoice-meta-cell strong {
            display: block;
            margin-bottom: 5px;
            font-size: 11px;
        }
        
        .parties-section {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }
        
        .parties-row {
            display: table-row;
        }
        
        .party-cell {
            display: table-cell;
            width: 50%;
            padding: 15px 20px;
            border: 1px solid #000;
            vertical-align: top;
            font-size: 11px;
            line-height: 1.6;
        }
        
        .party-cell strong {
            display: block;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #000;
            padding: 10px;
            text-align: left;
            font-size: 11px;
        }
        
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }
        
        .items-table td.number {
            text-align: right;
        }
        
        .items-table td.center {
            text-align: center;
        }
        
        .totals-section {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }
        
        .totals-row {
            display: table-row;
        }
        
        .totals-cell {
            display: table-cell;
            padding: 10px 20px;
            border: 1px solid #000;
            font-size: 12px;
        }
        
        .totals-cell.label {
            width: 70%;
            text-align: right;
            font-weight: bold;
        }
        
        .totals-cell.amount {
            width: 30%;
            text-align: right;
            font-weight: bold;
        }
        
        .grand-total {
            background-color: #f5f5f5;
        }
        
        .footer {
            text-align: center;
            padding: 15px;
            border-top: 1px solid #000;
            font-size: 10px;
            font-style: italic;
            position: absolute;
            bottom: 0;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <h1>TAX INVOICE</h1>
        </div>
        
        <!-- Company Header -->
        <div class="company-header">
            <div class="logo-section">
                <div class="logo-placeholder">
                    ${companyInfo.logo || 'LOGO'}
                </div>
            </div>
            <div class="company-details">
                <strong>${companyInfo.name || 'Company Name'}</strong>
                ${companyInfo.address || ''}<br>
                ${companyInfo.address2 || ''}<br>
                ${companyInfo.city || ''}, ${companyInfo.state || ''}<br>
                ${companyInfo.country || 'India'} ${companyInfo.postalCode || ''}<br>
                ${companyInfo.stateCode || 'Maharashtra'}, India<br>
                <strong>PAN:</strong> ${companyInfo.pan || ''}<br>
                <strong>CIN:</strong> ${companyInfo.cin || ''}<br>
                <strong>GSTIN:</strong> ${companyInfo.gstin || ''}<br>
                ${companyInfo.email || ''}
            </div>
        </div>
        
        <!-- Invoice Meta -->
        <div class="invoice-meta">
            <div class="invoice-meta-row">
                <div class="invoice-meta-cell">
                    <strong>Invoice No</strong>
                    ${invoiceNumber}
                </div>
                <div class="invoice-meta-cell">
                    <strong>Invoice Date</strong>
                    ${invoiceDate}
                </div>
            </div>
        </div>
        
        <!-- Bill To / Ship To -->
        <div class="parties-section">
            <div class="parties-row">
                <div class="party-cell">
                    <strong>Bill To</strong>
                    ${order.customer?.name || 'Customer Name'}<br>
                    ${order.customer?.address || 'Address Line 1'}<br>
                    ${order.customer?.address2 || 'Address Line 2'}<br>
                    ${order.customer?.city || 'City'} ${order.customer?.postalCode || ''}<br>
                    ${order.customer?.state || 'State'}<br>
                    Email: ${order.customer?.email || ''}<br>
                    Phone: ${order.customer?.phone || ''}
                </div>
                <div class="party-cell">
                    <strong>Ship To</strong>
                    ${order.shipping?.name || order.customer?.name || 'Customer Name'}<br>
                    ${order.shipping?.address || order.customer?.address || 'Address Line 1'}<br>
                    ${order.shipping?.address2 || order.customer?.address2 || 'Address Line 2'}<br>
                    ${order.shipping?.city || order.customer?.city || 'City'} ${order.shipping?.postalCode || order.customer?.postalCode || ''}<br>
                    ${order.shipping?.state || order.customer?.state || 'State'}<br>
                    Email: ${order.shipping?.email || order.customer?.email || ''}<br>
                    Phone: ${order.shipping?.phone || order.customer?.phone || ''}
                </div>
            </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item & Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.productInfo && order.productInfo.length > 0 
                    ? order.productInfo.map(item => `
                <tr>
                    <td>${item.productName || 'Product'}</td>
                    <td class="center">${item.quantity || 1}</td>
                    <td class="number">₹${parseFloat(item.price || 0).toFixed(2)}</td>
                    <td class="number">₹${parseFloat(item.total || 0).toFixed(2)}</td>
                </tr>
                `).join('')
                    : `<tr><td colspan="4" style="text-align: center;">No items found</td></tr>`
                }
            </tbody>
        </table>
        
        <!-- Totals Section -->
        <div class="totals-section">
            <div class="totals-row">
                <div class="totals-cell label">Subtotal</div>
                <div class="totals-cell amount">₹${subtotal.toFixed(2)}</div>
            </div>
            <div class="totals-row">
                <div class="totals-cell label">IGST (${igstRate}%)</div>
                <div class="totals-cell amount">₹${igstAmount.toFixed(2)}</div>
            </div>
            <div class="totals-row grand-total">
                <div class="totals-cell label">Grand Total</div>
                <div class="totals-cell amount">₹${grandTotal.toFixed(2)}</div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            This is a system-generated invoice. No seal or signature is required.
        </div>
    </div>
</body>
</html>
  `;
};

// Create invoice as IMAGE (PNG)
const createInvoice = async (req, res) => {
  const { orderId, customerId } = req.body;

  try {
    // Verify order exists
    const order = await Orders.findByPk(orderId, {
      include: [
        {
          model: Customers,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postalCode']
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Check if invoice already exists for this order
    const existingInvoice = await Invoice.findOne({ where: { orderId } });
    if (existingInvoice) {
      return res.status(400).json({ 
        success: false, 
        message: "Invoice already exists for this order",
        data: existingInvoice
      });
    }

    // Company information (should come from database/config)
    const companyInfo = {
      name: 'Microline India Private Limited',
      address: 'Eucharistic Congress Building No.2,',
      address2: '2nd Floor, 5th Convent Street, Apollo Bunder, Colaba,',
      city: 'Mumbai',
      postalCode: '400001',
      state: 'Maharashtra',
      stateCode: 'Maharashtra',
      country: 'India',
      pan: 'AABCM2689R',
      cin: 'U72900MH1996PTC096678',
      gstin: '27AABCM2689R1ZN',
      email: 'accounts1.mumbai@microlineindia.com',
      logo: 'microline',
      invoicePrefix: 'MI/B/25-26'
    };

    // Generate HTML invoice
    const invoiceHtml = generateInvoiceHTML(order, companyInfo);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads');
    const invoicesDir = path.join(uploadsDir, 'invoices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    // Generate PNG IMAGE from HTML using Puppeteer
    const invoiceFileName = `invoice_${orderId}_${Date.now()}.png`;
    const invoiceFilePath = path.join(invoicesDir, invoiceFileName);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport size to A4 dimensions (794 x 1123 pixels at 96 DPI)
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2 // Higher quality image (2x resolution)
    });
    
    await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });
    
    // Take screenshot as PNG
    await page.screenshot({
      path: invoiceFilePath,
      type: 'png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: 794,
        height: 1123
      }
    });
    
    await browser.close();

    const newInvoice = await Invoice.create({
      orderId,
      customerId: order.customerId,
      invoiceFile: invoiceFileName,
    });

    res.json({
      success: true,
      message: "Invoice created successfully as image",
      data: newInvoice,
      invoiceUrl: `/api/invoices/view/${invoiceFileName}`
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create invoice",
      error: error.message 
    });
  }
};

// View invoice image
const viewInvoice = (req, res) => {
  const { filename } = req.params;
  const invoicesDir = path.join(__dirname, '../../uploads/invoices');
  const filePath = path.join(invoicesDir, filename);

  // Security check: ensure filename doesn't contain path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid filename' 
    });
  }

  // Check if file exists
  if (fs.existsSync(filePath)) {
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/png';
    
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    }
    
    // Set proper headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming invoice:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error reading invoice file' 
      });
    });
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'Invoice file not found' 
    });
  }
};

// Download invoice image
const downloadInvoice = (req, res) => {
  const { filename } = req.params;
  const invoicesDir = path.join(__dirname, '../../uploads/invoices');
  const filePath = path.join(invoicesDir, filename);

  // Security check
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid filename' 
    });
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/png';
    
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'Invoice file not found' 
    });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  generateInvoiceHTML,
  viewInvoice,
  downloadInvoice
};