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
    timerRef.current = setTimeout(() => setGlowing(false), 1500);
  };

  const stockColor = product.stock >= 20 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
    product.stock >= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';

  const isOutOfStock = hasPrice && product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  return (
    <div
      className={`bg-white dark:bg-slate-800 border rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer group relative
        ${isOutOfStock ? 'opacity-70 border-card-border dark:border-slate-700' : ''}
        ${!hasPrice ? 'border-amber-300 dark:border-amber-600' : ''}
        ${glowing ? 'border-purple-400 dark:border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)] scale-[1.03]' : hasPrice ? 'border-card-border dark:border-slate-700' : ''}
      `}
      style={{ transition: 'all 0.2s ease' }}
      onClick={handleClick}
    >
      <div className="h-[80px] bg-gray-100 dark:bg-slate-700 relative overflow-hidden">
        {product.image_path ? (
          <img
            src={product.image_path.startsWith('http') ? product.image_path : `${API_BASE}${product.image_path}`}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/1e293b/ffffff?text=' + encodeURIComponent(product.name); }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 5H4V19L13.292 9.706a1 1 0 011.414 0L20 15.01V5zM2 3.993A1 1 0 012.992 3h18.016c.548 0 .992.445.992.993v16.014a1 1 0 01-.992.993H2.992A.993.993 0 012 20.007V3.993zM8 11a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-[10px] bg-red-500 px-2 py-0.5 rounded">نفد</span>
          </div>
        )}

        {isLowStock && (
          <div className="absolute top-1 left-1">
            <span className="text-[9px] bg-orange-500 text-white px-1.5 py-px rounded-full">منخفض</span>
          </div>
        )}

        {!hasPrice && (
          <div className="absolute top-1 right-1">
            <span className="text-[9px] bg-amber-500 text-white px-1.5 py-px rounded-full">بدون سعر</span>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
          className="absolute bottom-1 left-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700 shadow-lg"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="p-2">
        <h3 className="font-bold text-xs text-text-primary dark:text-white truncate leading-tight">{product.name}</h3>
        <p className="text-[10px] text-text-muted dark:text-slate-400 mt-0.5 truncate">{product.category}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-primary font-bold text-xs">
            {hasPrice ? `${product.selling_price!.toFixed(2)} ج.م` : 'سعر حر'}
          </span>
          <span className={`text-[10px] px-1.5 py-px rounded-full ${stockColor}`}>
            {product.stock} {product.unit}
          </span>
        </div>
        <div className="mt-1.5 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${product.stock < 5 ? 'bg-red-500' : product.stock < 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, (product.stock / (product.max_stock || 100)) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
