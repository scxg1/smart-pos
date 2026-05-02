import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { usePOSStore } from '../store/posStore';

export default function ReceiptModal() {
  const { showReceipt, setShowReceipt, lastSale, settings } = usePOSStore();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!showReceipt || !lastSale) return null;

  const receiptNumber = (lastSale as any).receiptNumber || lastSale.id + 1000;
  const items = lastSale.items || [];
  const taxRate = parseFloat(settings.tax_rate || '15');

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>فاتورة #${receiptNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 10px; max-width: 300px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .border-top { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
            th, td { text-align: right; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #eee; }
            th { border-bottom: 1px dashed #000; }
            .total { font-size: 16px; font-weight: bold; }
            .flex-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
            .receipt-header h3 { margin: 0 0 4px 0; font-size: 18px; }
            .receipt-header p { margin: 0; font-size: 12px; color: #444; }
            .mb-3 { margin-bottom: 12px; }
            .pt-3 { padding-top: 12px; }
            .mt-3 { margin-top: 12px; }
            .mt-1 { margin-top: 4px; }
            .text-sm { font-size: 12px; }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => setShowReceipt(false)} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-card-border">
          <h2 className="font-bold text-lg">الفاتورة</h2>
          <button onClick={() => setShowReceipt(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} id="receipt-printable" className="p-6">
          {/* Header */}
          <div className="center text-center mb-4 receipt-header">
            <h3 className="text-xl font-bold">{settings.store_name || 'نقطة البيع الذكية'}</h3>
            {settings.store_address && <p className="text-sm text-gray-600 mt-1">{settings.store_address}</p>}
            {settings.store_phone && <p className="text-sm text-gray-600">{settings.store_phone}</p>}
            {settings.store_tax_number && <p className="text-sm text-gray-600">الرقم الضريبي: {settings.store_tax_number}</p>}
            {settings.receipt_header && <p className="text-sm text-gray-500 mt-2">{settings.receipt_header}</p>}
          </div>

          {/* Receipt info */}
          <div className="border-top pt-3 mb-3 text-sm">
            <div className="flex-row flex justify-between">
              <span>رقم الفاتورة:</span>
              <span className="font-bold">#{receiptNumber}</span>
            </div>
            <div className="flex-row flex justify-between mt-1">
              <span>التاريخ:</span>
              <span>{new Date(lastSale.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
            <div className="flex-row flex justify-between mt-1">
              <span>الوقت:</span>
              <span>{new Date(lastSale.created_at).toLocaleTimeString('ar-EG')}</span>
            </div>
            <div className="flex-row flex justify-between mt-1">
              <span>طريقة الدفع:</span>
              <span>{lastSale.payment_method}</span>
            </div>
          </div>

          {/* Items */}
          <table className="w-full">
            <thead>
              <tr className="text-sm text-gray-600">
                <th className="text-right py-2">المنتج</th>
                <th className="text-center py-2">الكمية</th>
                <th className="text-center py-2">السعر</th>
                <th className="text-left py-2">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((item: any, idx: number) => (
                <tr key={idx} className="text-sm border-b border-gray-100">
                  <td className="py-1.5">{item.name || 'منتج غير معروف'}</td>
                  <td className="text-center" style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td className="text-center" style={{ textAlign: 'center' }}>{Number(item.unit_price || 0).toFixed(2)}</td>
                  <td className="text-left" style={{ textAlign: 'left' }}>{Number(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '10px 0', color: 'red' }}>عذراً، لم يتم العثور على منتجات</td></tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-top mt-3 pt-3 space-y-1.5 text-sm">
            <div className="flex-row flex justify-between">
              <span>المجموع الفرعي:</span>
              <span>{items.reduce((sum: number, item: any) => sum + item.subtotal, 0).toFixed(2)} ج.م</span>
            </div>
            {lastSale.discount > 0 && (
              <div className="flex-row flex justify-between text-danger">
                <span>الخصم ({lastSale.discount}%):</span>
                <span>- {(items.reduce((sum: number, item: any) => sum + item.subtotal, 0) * lastSale.discount / 100).toFixed(2)} ج.م</span>
              </div>
            )}
            {lastSale.tax > 0 && (
              <div className="flex-row flex justify-between">
                <span>الضريبة ({taxRate}%):</span>
                <span>{lastSale.tax.toFixed(2)} ج.م</span>
              </div>
            )}
            <div className="border-top pt-2 flex-row flex justify-between total font-bold text-lg mt-3">
              <span>الإجمالي:</span>
              <span className="text-primary">{lastSale.total.toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Footer */}
          {settings.receipt_footer && (
            <div className="center text-center mt-4 text-sm text-gray-500 border-t border-dashed border-gray-300 pt-3">
              {settings.receipt_footer}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-card-border">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 hover:bg-blue-700"
          >
            <Download size={18} />
            تحميل PDF
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl border border-card-border text-text-muted font-medium flex items-center justify-center gap-2 hover:bg-gray-50 relative group"
            title="قريباً"
          >
            <Printer size={18} />
            طباعة
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              قريباً
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
