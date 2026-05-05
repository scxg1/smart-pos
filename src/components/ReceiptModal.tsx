import React, { useRef, useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { usePOSStore } from '../store/posStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReceiptModal() {
  const { showReceipt, setShowReceipt, lastSale, settings } = usePOSStore();
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showReceipt) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('thermal-print-btn')?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showReceipt]);

  if (!showReceipt || !lastSale) return null;

  const receiptNumber = (lastSale as any).receiptNumber || lastSale.id + 1000;
  const items = lastSale.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
  const taxRate = parseFloat(settings.tax_rate || '15');
  const date = new Date(lastSale.created_at);

  const handleThermalPrint = () => {
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>فاتورة #${receiptNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:12px;width:80mm;margin:0 auto;padding:4mm;color:#000;direction:rtl}
.center{text-align:center}
.bold{font-weight:bold}
.sep{border:none;border-top:1px dashed #000;margin:4px 0}
.store-name{font-size:16px;font-weight:bold;margin-bottom:2px}
.meta{font-size:11px;color:#333;margin:1px 0}
table{width:100%;border-collapse:collapse;margin:4px 0;font-size:11px}
th{font-weight:bold;border-bottom:1px solid #000;padding:2px 0;text-align:right}
td{padding:2px 0;vertical-align:top}
.col-name{width:30%}
.col-cat{width:18%;font-size:10px;color:#555}
.col-qty{width:10%;text-align:center}
.col-price{width:18%;text-align:center}
.col-total{width:24%;text-align:left;font-weight:500}
.totals{font-size:12px}
.totals-row{display:flex;justify-content:space-between;margin:2px 0}
.totals-row.grand{font-size:14px;font-weight:bold;margin-top:4px;padding-top:4px;border-top:1px solid #000}
.footer{text-align:center;font-size:11px;color:#444;margin-top:4px;padding-top:4px;border-top:1px dashed #000}
@media print{@page{size:80mm auto;margin:0}body{padding:2mm}}
</style>
</head>
<body>
<div class="center">
  <div class="store-name">${settings.store_name || 'نقطة البيع الذكية'}</div>
  ${settings.store_address ? `<div class="meta">${settings.store_address}</div>` : ''}
  ${settings.store_phone ? `<div class="meta">هاتف: ${settings.store_phone}</div>` : ''}
  ${settings.store_tax_number ? `<div class="meta">الرقم الضريبي: ${settings.store_tax_number}</div>` : ''}
  ${settings.receipt_header ? `<div class="meta" style="margin-top:3px">${settings.receipt_header}</div>` : ''}
</div>
<hr class="sep"/>
<div class="meta"><strong>رقم الفاتورة:</strong> #${receiptNumber}</div>
<div class="meta"><strong>التاريخ:</strong> ${date.toLocaleDateString('ar-EG')}</div>
<div class="meta"><strong>الوقت:</strong> ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
<div class="meta"><strong>الدفع:</strong> ${lastSale.payment_method}</div>
<hr class="sep"/>
<table>
<thead>
<tr>
  <th class="col-name">الصنف</th>
  <th class="col-cat">الفئة</th>
  <th class="col-qty">ك</th>
  <th class="col-price">سعر</th>
  <th class="col-total">مجموع</th>
</tr>
</thead>
<tbody>
${items.map((item: any) => `<tr>
  <td class="col-name">${item.name || ''}</td>
  <td class="col-cat">${item.category || '-'}</td>
  <td class="col-qty" style="text-align:center">${item.quantity}</td>
  <td class="col-price" style="text-align:center">${Number(item.unit_price || 0).toFixed(2)}</td>
  <td class="col-total" style="text-align:left">${Number(item.subtotal || 0).toFixed(2)}</td>
</tr>`).join('')}
</tbody>
</table>
<hr class="sep"/>
<div class="totals">
  <div class="totals-row"><span>المجموع الفرعي</span><span>${subtotal.toFixed(2)} ج.م</span></div>
  ${lastSale.discount > 0 ? `<div class="totals-row"><span>خصم (${lastSale.discount}%)</span><span>- ${(subtotal * lastSale.discount / 100).toFixed(2)} ج.م</span></div>` : ''}
  ${lastSale.tax > 0 ? `<div class="totals-row"><span>ضريبة (${taxRate}%)</span><span>${Number(lastSale.tax).toFixed(2)} ج.م</span></div>` : ''}
  <div class="totals-row grand"><span>الإجمالي</span><span>${Number(lastSale.total).toFixed(2)} ج.م</span></div>
</div>
${settings.receipt_footer ? `<div class="footer">${settings.receipt_footer}</div>` : ''}
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),1000)}</script>
</body>
</html>`);
    win.document.close();
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      const pdf = new jsPDF('p', 'mm', 'a5');
      const imgData = canvas.toDataURL('image/png');
      const w = 148;
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`فاتورة_${receiptNumber}.pdf`);
    } catch {
      handleThermalPrint();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReceipt(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-bold text-base text-slate-800">فاتورة #{receiptNumber}</h2>
          <button onClick={() => setShowReceipt(false)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div ref={receiptRef} className="p-5 text-sm" style={{ fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif', direction: 'rtl' }}>
          <div className="text-center mb-3">
            <p className="text-base font-bold text-slate-900">{settings.store_name || 'نقطة البيع الذكية'}</p>
            {settings.store_address && <p className="text-[11px] text-slate-400 mt-0.5">{settings.store_address}</p>}
            {settings.store_phone && <p className="text-[11px] text-slate-400">هاتف: {settings.store_phone}</p>}
            {settings.store_tax_number && <p className="text-[11px] text-slate-400">الرقم الضريبي: {settings.store_tax_number}</p>}
            {settings.receipt_header && <p className="text-[11px] text-slate-300 mt-1.5 italic">{settings.receipt_header}</p>}
          </div>

          <div className="border-t border-dashed border-slate-200 pt-3 mb-3 space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between"><span>رقم الفاتورة:</span><span className="font-bold text-slate-800">#{receiptNumber}</span></div>
            <div className="flex justify-between"><span>التاريخ:</span><span>{date.toLocaleDateString('ar-EG')}</span></div>
            <div className="flex justify-between"><span>الوقت:</span><span>{date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div className="flex justify-between"><span>طريقة الدفع:</span><span className="font-semibold">{lastSale.payment_method}</span></div>
          </div>

          <table className="w-full text-[11px] border-t border-dashed border-slate-200" style={{ borderTop: '1px dashed #e2e8f0', marginTop: '4px' }}>
            <thead>
              <tr className="text-slate-400 border-b border-dashed border-slate-200">
                <th className="text-right py-1.5 font-semibold" style={{ width: '30%' }}>الصنف</th>
                <th className="text-right py-1.5 font-semibold" style={{ width: '18%' }}>الفئة</th>
                <th className="text-center py-1.5 font-semibold" style={{ width: '10%' }}>ك</th>
                <th className="text-center py-1.5 font-semibold" style={{ width: '18%' }}>سعر</th>
                <th className="text-left py-1.5 font-semibold" style={{ width: '24%' }}>مجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="py-1.5 text-slate-800 font-medium">{item.name}</td>
                  <td className="py-1.5 text-slate-400 text-[10px]">{item.category || '-'}</td>
                  <td className="py-1.5 text-center text-slate-500">{item.quantity}</td>
                  <td className="py-1.5 text-center text-slate-500 tabular-nums">{Number(item.unit_price || 0).toFixed(2)}</td>
                  <td className="py-1.5 text-left font-medium tabular-nums text-slate-800">{Number(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-3 text-slate-300">لا توجد منتجات</td></tr>
              )}
            </tbody>
          </table>

          <div className="border-t border-dashed border-slate-200 mt-2 pt-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-500"><span>المجموع الفرعي:</span><span className="tabular-nums">{subtotal.toFixed(2)} ج.م</span></div>
            {lastSale.discount > 0 && (
              <div className="flex justify-between text-red-500"><span>خصم ({lastSale.discount}%):</span><span className="tabular-nums">- {(subtotal * lastSale.discount / 100).toFixed(2)} ج.م</span></div>
            )}
            {lastSale.tax > 0 && (
              <div className="flex justify-between text-slate-500"><span>ضريبة ({taxRate}%):</span><span className="tabular-nums">{Number(lastSale.tax).toFixed(2)} ج.م</span></div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-slate-100 text-slate-900">
              <span>الإجمالي:</span>
              <span className="text-indigo-600 tabular-nums">{Number(lastSale.total).toFixed(2)} ج.م</span>
            </div>
          </div>

          {settings.receipt_footer && (
            <p className="text-center text-[11px] text-slate-300 mt-3 pt-2.5 border-t border-dashed border-slate-200">
              {settings.receipt_footer}
            </p>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 py-2 rounded-xl bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 shadow-sm transition-colors"
          >
            <Download size={15} />
            تحميل PDF
          </button>
          <button
            id="thermal-print-btn"
            onClick={handleThermalPrint}
            className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-sm transition-colors"
          >
            <Printer size={15} />
            طباعة حرارية
          </button>
        </div>
      </div>
    </div>
  );
}
