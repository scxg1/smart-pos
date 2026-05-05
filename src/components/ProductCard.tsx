import React, { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { usePOSStore, Product } from '../store/posStore';

interface ProductCardProps {
  product: Product;
}

const API_BASE = 'http://localhost:3001';

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = usePOSStore();
  const [glowing, setGlowing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const hasPrice = product.selling_price !== null && product.selling_price !== undefined && product.selling_price > 0;

  const handleClick = () => {
    if (!hasPrice && product.stock <= 0) return;
    if (hasPrice && product.stock <= 0) return;
    addToCart(product);
    setGlowing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setGlowing(false), 1200);
  };

  const stockColor = product.stock >= 20 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
    product.stock >= 5 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400';

  const isOutOfStock = hasPrice && product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  return (
    <div
      className={`group bg-white dark:bg-slate-800 rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-card-md
        ${isOutOfStock ? 'opacity-60 border-slate-100 dark:border-slate-700/50' : ''}
        ${!hasPrice ? 'border-amber-200 dark:border-amber-600/50' : ''}
        ${glowing ? 'border-indigo-300 dark:border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]' : hasPrice ? 'border-slate-100 dark:border-slate-700/50' : ''}
      `}
      onClick={handleClick}
    >
      <div className="h-[90px] bg-slate-50 dark:bg-slate-700/50 relative overflow-hidden">
        {product.image_path ? (
          <img
            src={product.image_path.startsWith('http') ? product.image_path : `${API_BASE}${product.image_path}`}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/1e293b/ffffff?text=' + encodeURIComponent(product.name); }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-600">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 5H4V19L13.292 9.706a1 1 0 011.414 0L20 15.01V5zM2 3.993A1 1 0 012.992 3h18.016c.548 0 .992.445.992.993v16.014a1 1 0 01-.992.993H2.992A.993.993 0 012 20.007V3.993zM8 11a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-[9px] bg-red-500 px-2 py-0.5 rounded-md shadow-sm">نفد</span>
          </div>
        )}

        {isLowStock && (
          <div className="absolute top-1 left-1">
            <span className="text-[8px] bg-orange-500 text-white px-1.5 py-px rounded-md shadow-sm">منخفض</span>
          </div>
        )}

        {!hasPrice && (
          <div className="absolute top-1 right-1">
            <span className="text-[8px] bg-amber-500 text-white px-1.5 py-px rounded-md shadow-sm">سعر حر</span>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
          className="absolute bottom-1 left-1 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-indigo-600 shadow-md"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="p-2.5">
        <h3 className="font-bold text-[13px] text-slate-800 dark:text-white truncate leading-tight">{product.name}</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{product.category}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[12px]">
            {hasPrice ? `${product.selling_price!.toFixed(2)} ج.م` : 'سعر حر'}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${stockColor}`}>
            {product.stock} {product.unit}
          </span>
        </div>
        <div className="mt-1.5 h-[3px] bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${product.stock < 5 ? 'bg-red-500' : product.stock < 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, (product.stock / (product.max_stock || 100)) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
