const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Invoice = require("../../models/orders/invoice.model");
const Orders = require("../../models/orders/order.model");
const Customers = require("../../models/customer/customers.model");

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
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  res.json({ success: true, data: invoice });
};

const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { invoiceFile } = req.body;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  await invoice.update({ invoiceFile });

  res.json({ success: true, message: "Invoice updated successfully" });
};

const deleteInvoice = async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  if (invoice.invoiceFile) {
    const filePath = path.join(__dirname, '../../uploads/invoices', invoice.invoiceFile);
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
    // This is a legacy function kept for compatibility if needed elsewhere
    return `HTML Legacy Support`;
};

// ===== HELPERS =====

/**
 * Parse the shippingAddress field which is stored as:
 * "Name, Address, City, State - Pincode"
 */
const parseShippingAddress = (shippingAddress) => {
  if (!shippingAddress) return {};

  // Try JSON first (future-proofing)
  if (typeof shippingAddress === 'object') return shippingAddress;
  try {
    const parsed = JSON.parse(shippingAddress);
    if (typeof parsed === 'object') return parsed;
  } catch (e) { /* not JSON, parse as string */ }

  // Parse formatted string: "Name, Address, City, State - Pincode"
  const parts = shippingAddress.split(',').map(s => s.trim());
  if (parts.length >= 4) {
    const lastPart = parts[parts.length - 1]; // "State - Pincode"
    const statePinMatch = lastPart.match(/^(.+?)\s*-\s*(\d+)$/);
    return {
      fullName: parts[0],
      address: parts[1],
      address2: parts.length > 4 ? parts.slice(2, parts.length - 2).join(', ') : '',
      city: parts[parts.length - 2],
      state: statePinMatch ? statePinMatch[1].trim() : lastPart,
      pincode: statePinMatch ? statePinMatch[2] : '',
    };
  }

  return { address: shippingAddress };
};

/**
 * Format currency for PDF display using Unicode ₹
 */
const formatCurrency = (amount) => {
  const num = parseFloat(amount || 0);
  return `\u20B9${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ===== PDF GENERATION =====

const generatePDFInvoice = (order, companyInfo, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- Load Fonts ---
      const nirmalaFont = path.join(__dirname, '../../assets/fonts/Nirmala-Regular.ttf');
      const nirmalaBoldFont = path.join(__dirname, '../../assets/fonts/Nirmala-Bold.ttf');
      const interFont = path.join(__dirname, '../../assets/fonts/Inter-Regular.ttf');
      const interBoldFont = path.join(__dirname, '../../assets/fonts/Inter-Bold.ttf');
      
      const hasNirmala = fs.existsSync(nirmalaFont);
      const hasInter = fs.existsSync(interFont);
      
      console.log(`[Invoice Font Check] Nirmala: ${hasNirmala}, Inter: ${hasInter}`);

      // Use Nirmala as primary font if available (best for ₹), fallback to Inter, then Helvetica
      const fontRegular = hasNirmala ? nirmalaFont : (hasInter ? interFont : 'Helvetica');
      const fontBold = hasNirmala ? nirmalaBoldFont : (hasInter ? interBoldFont : 'Helvetica-Bold');
      
      if (!hasNirmala) {
        console.warn("[Invoice Warning] Nirmala font missing! Rupee symbol (₹) may render incorrectly.");
      }

      // --- Layout Constants ---
      const LEFT = 40;
      const RIGHT = 555;
      const WIDTH = RIGHT - LEFT;
      const CL = 50;  // Content left padding
      const MID = 297; // Middle X for two-column sections

      // Drawing helpers
      const hLine = (yPos) => { doc.moveTo(LEFT, yPos).lineTo(RIGHT, yPos).stroke(); };
      const vLine = (x, y1, y2) => { doc.moveTo(x, y1).lineTo(x, y2).stroke(); };

      // Parse shipping address and customer data
      const shippingAddr = parseShippingAddress(order.shippingAddress);
      const customer = order.Customer || order.customer || {};

      // ===================== HEADER =====================
      let y = 50;
      doc.fontSize(18).font(fontBold).text('TAX INVOICE', LEFT, y, { align: 'center', width: WIDTH });
      y = 75;
      hLine(y);

      // ===================== LOGO & COMPANY INFO =====================
      const logoSectionY = y + 10;

      // Logo - black rectangle with red accent triangle
      doc.save();
      doc.rect(CL, logoSectionY, 130, 45).fill('#1a1a1a');
      // Red triangular accent
      doc.moveTo(CL, logoSectionY)
         .lineTo(CL + 50, logoSectionY)
         .lineTo(CL, logoSectionY + 45)
         .fill('#e74c3c');
      doc.restore();
      doc.fillColor('#ffffff').fontSize(11).font(fontBold)
         .text('rabbitnfinch', CL + 12, logoSectionY + 17);
      doc.fillColor('#000000');

      // Company details (right-aligned)
      const compRightW = 240;
      const compX = RIGHT - compRightW - 10;
      let cy = logoSectionY;
      doc.fontSize(11).font(fontBold).text(companyInfo.name, compX, cy, { align: 'right', width: compRightW });
      cy += 14;
      doc.font(fontRegular).fontSize(7.5);
      doc.text(companyInfo.address1, compX, cy, { align: 'right', width: compRightW }); cy += 10;
      doc.text(companyInfo.address2, compX, cy, { align: 'right', width: compRightW }); cy += 10;
      doc.text(companyInfo.address3, compX, cy, { align: 'right', width: compRightW }); cy += 10;
      doc.text(companyInfo.address4, compX, cy, { align: 'right', width: compRightW }); cy += 10;
      doc.text('India', compX, cy, { align: 'right', width: compRightW }); cy += 13;
      doc.fontSize(9).font(fontBold).text('GSTIN:', compX, cy, { align: 'right', width: compRightW }); cy += 12;
      doc.font(fontRegular).fontSize(8);
      doc.text(companyInfo.gstin, compX, cy, { align: 'right', width: compRightW }); cy += 10;
      doc.text(companyInfo.email, compX, cy, { align: 'right', width: compRightW }); cy += 10;

      y = Math.max(logoSectionY + 55, cy + 5);
      hLine(y);

      // ===================== INVOICE META =====================
      const metaY = y + 6;
      const invoiceNumber = `RF/${new Date(order.createdAt || Date.now()).getFullYear()}-${order.id}`;
      const invoiceDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      doc.fontSize(8).font(fontBold).fillColor('#555').text('Invoice No', CL, metaY);
      doc.fontSize(7.5).font(fontRegular).fillColor('#000').text(invoiceNumber, CL, metaY + 12);

      const metaDividerX = 410;
      vLine(metaDividerX, y, y + 32);

      doc.fontSize(8).font(fontBold).fillColor('#555').text('Invoice Date', metaDividerX + 10, metaY);
      doc.fontSize(8).font(fontRegular).fillColor('#000').text(invoiceDate, metaDividerX + 10, metaY + 12);

      y += 32;
      hLine(y);

      // ===================== BILL TO / SHIP TO =====================
      const addrStartY = y;
      const addrContentY = y + 8;

      // Bill To
      doc.fontSize(10).font(fontBold).fillColor('#000').text('Bill To', CL, addrContentY);
      let billY = addrContentY + 16;
      doc.fontSize(8).font(fontRegular);
      
      const billAddr = [
        customer.name,
        customer.address,
        customer.city,
        customer.state ? `${customer.state}${customer.postalCode ? ' - ' + customer.postalCode : ''}` : null
      ].filter(line => line && line.trim() !== '');

      billAddr.forEach(line => {
        doc.text(line, CL, billY);
        billY += 11;
      });
      doc.text(`Email: ${customer.email || ''}`, CL, billY); billY += 11;
      doc.text(`Phone: ${customer.phone || ''}`, CL, billY); billY += 11;

      // Ship To
      doc.fontSize(10).font(fontBold).text('Ship To', MID + 10, addrContentY);
      let shipY = addrContentY + 16;
      doc.fontSize(8).font(fontRegular);

      const shipAddr = [
        shippingAddr.fullName || customer.name,
        shippingAddr.address,
        shippingAddr.address2,
        shippingAddr.city,
        shippingAddr.state ? `${shippingAddr.state}${shippingAddr.pincode ? ' - ' + shippingAddr.pincode : ''}` : null
      ].filter(line => line && line.trim() !== '');

      shipAddr.forEach(line => {
        doc.text(line, MID + 10, shipY);
        shipY += 11;
      });
      doc.text(`Email: ${customer.email || ''}`, MID + 10, shipY); shipY += 11;
      doc.text(`Phone: ${shippingAddr.phone || customer.phone || ''}`, MID + 10, shipY); shipY += 11;

      const addrEndY = Math.max(billY, shipY) + 5;
      vLine(MID, addrStartY, addrEndY);
      y = addrEndY;
      hLine(y);

      // ===================== ITEMS TABLE =====================
      // Column positions
      const col = {
        item: CL,
        qty: 215,
        rate: 270,
        igst: 380,
        total: 465,
      };

      // Table Header
      const headerY = y + 8;
      doc.fontSize(8).font(fontBold).fillColor('#000');
      doc.text('Item & Description', col.item, headerY, { width: col.qty - col.item - 5 });
      doc.text('Qty', col.qty, headerY, { align: 'center', width: col.rate - col.qty });
      doc.text('Taxable Rate', col.rate, headerY, { align: 'center', width: col.igst - col.rate });
      doc.text('IGST Amount', col.igst, headerY, { align: 'center', width: col.total - col.igst });
      doc.text('Total (Incl. Tax)', col.total, headerY, { align: 'center', width: RIGHT - col.total - 5 });

      const tableHeaderBottomY = y + 23;
      hLine(tableHeaderBottomY);

      // Table Rows
      let itemY = tableHeaderBottomY + 8;
      const items = order.OrderItems || [];

      items.forEach(item => {
        
        doc.font(fontRegular).fontSize(8).fillColor('#000');
        const taxableRate = parseFloat(item.unitPrice || 0);
        const qty = parseInt(item.quantity || 1);
        const taxAmount = parseFloat(item.cgst || 0) + parseFloat(item.sgst || 0) + parseFloat(item.igst || 0);
        const totalInclTax = (taxableRate * qty) + taxAmount;

        doc.text(item.productName || 'Product', col.item, itemY, { width: col.qty - col.item - 5 });
        doc.text(String(qty), col.qty, itemY, { align: 'center', width: col.rate - col.qty });
        doc.text(formatCurrency(taxableRate), col.rate, itemY, { align: 'center', width: col.igst - col.rate });
        doc.text(formatCurrency(taxAmount), col.igst, itemY, { align: 'center', width: col.total - col.igst });
        doc.text(formatCurrency(totalInclTax), col.total, itemY, { align: 'center', width: RIGHT - col.total - 5 });

        itemY += 20;
      });

      if (items.length === 0) itemY += 20;

      const tableEndY = itemY + 5;

      // Table column vertical dividers
      vLine(col.qty, y, tableEndY);
      vLine(col.rate, y, tableEndY);
      vLine(col.igst, y, tableEndY);
      vLine(col.total, y, tableEndY);

      y = tableEndY;
      hLine(y);

      // ===================== TOTALS =====================
      const totalsLabelX = col.igst - 15;
      const totalsLabelW = col.total - totalsLabelX - 5;
      const totalsValW = RIGHT - col.total - 10;

      // Subtotal
      let totY = y + 8;
      doc.fontSize(9).font(fontBold).fillColor('#000');
      doc.text('Subtotal', totalsLabelX, totY, { align: 'right', width: totalsLabelW });
      doc.text(formatCurrency(order.subTotal || 0), col.total, totY, { align: 'right', width: totalsValW });
      totY += 20;
      hLine(totY);

      // IGST
      totY += 8;
      const totalTax = parseFloat(order.totalIGST || 0) + parseFloat(order.totalCGST || 0) + parseFloat(order.totalSGST || 0);
      doc.text('IGST', totalsLabelX, totY, { align: 'right', width: totalsLabelW });
      doc.text(formatCurrency(totalTax), col.total, totY, { align: 'right', width: totalsValW });
      totY += 20;
      doc.moveTo(LEFT, totY).lineTo(RIGHT, totY).stroke();

      // Grand Total
      totY += 8;
      doc.fontSize(10).font(fontBold);
      doc.text('Grand Total', totalsLabelX, totY, { align: 'right', width: totalsLabelW });
      doc.text(formatCurrency(order.finalAmount || order.totalAmount || 0), col.total, totY, { align: 'right', width: totalsValW });
      totY += 20;
      hLine(totY); // Closing line for Grand Total

      // Vertical line for totals block
      vLine(col.total, y, totY);

      y = totY;

      // ===================== OUTER BORDER =====================
      // Set border height to exactly wrap the content plus some footer space
      const borderHeight = y - 40 + 40; 
      doc.rect(LEFT, 40, WIDTH, borderHeight).stroke();

      // ===================== FOOTER =====================
      const footerY = 40 + borderHeight - 20;
      // Red accent line above footer
      doc.save();
      doc.moveTo(LEFT + 1, footerY - 8).lineTo(RIGHT - 1, footerY - 8)
         .strokeColor('#e74c3c').lineWidth(1).stroke();
      doc.restore();
      doc.strokeColor('#000').lineWidth(1);

      doc.fontSize(7).font(fontRegular).fillColor('#e74c3c')
         .text('This is a system-generated invoice. No seal or signature is required.', LEFT, footerY, { align: 'center', width: WIDTH });

      doc.end();
      stream.on('finish', () => resolve(invoiceNumber));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

// ===== CREATE INVOICE =====

const createInvoice = async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Orders.findByPk(orderId, {
      include: [
        { model: Customers, as: 'Customer' },
        { model: require('../../models/orders/orderItems.model'), as: 'OrderItems' }
      ]
    });

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const existingInvoice = await Invoice.findOne({ where: { orderId } });
    if (existingInvoice) {
      // If it's an old PNG invoice, we want to regenerate it as a PDF
      if (existingInvoice.invoiceFile && existingInvoice.invoiceFile.endsWith('.png')) {
        await existingInvoice.destroy();
      } else {
        return res.status(200).json({ success: true, data: existingInvoice });
      }
    }

    const companyInfo = {
      name: 'Rabbit Finch',
      address1: 'Flat No.t-1, 3rd Floor, Shankar Residency,',
      address2: 'Sadanand Bhavan Road, Near Arya Samaj,',
      address3: 'Visveswarapuram, Basavanagudi,',
      address4: 'Bengaluru, Karnataka - 560004',
      gstin: '29AABCM2689R1ZN',
      email: 'info@rabbitnfinch.com',
      invoicePrefix: 'RF'
    };

    const uploadsDir = path.join(__dirname, '../../uploads/invoices');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const invoiceFileName = `invoice_${orderId}_${Date.now()}.pdf`;
    const invoiceFilePath = path.join(uploadsDir, invoiceFileName);

    await generatePDFInvoice(order, companyInfo, invoiceFilePath);

    const newInvoice = await Invoice.create({
      orderId,
      customerId: order.customerId,
      invoiceFile: invoiceFileName,
    });

    res.json({
      success: true,
      message: "Invoice created successfully as PDF",
      data: newInvoice,
      invoiceUrl: `/order/invoices/view/${invoiceFileName}`
    });
  } catch (error) {
    console.error("❌ [Invoice Error]:", error);
    res.status(500).json({ success: false, message: "Failed to generate invoice", error: error.message });
  }
};

const viewInvoice = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/invoices', filename);

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
};

const downloadInvoice = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/invoices', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
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