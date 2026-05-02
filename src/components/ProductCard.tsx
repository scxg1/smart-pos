import React from 'react';
import { Plus } from 'lucide-react';
import { usePOSStore, Product } from '../store/posStore';

interface ProductCardProps {
  product: Product;
}

const API_BASE = 'http://localhost:3001';

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = usePOSStore();

  const stockColor = product.stock >= 20 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
    product.stock >= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-card-border dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group relative
        ${isOutOfStock ? 'opacity-70' : ''}`}
      onClick={() => !isOutOfStock && addToCart(product)}
    >
      <div className="h-[140px] bg-gray-100 dark:bg-slate-700 relative overflow-hidden">
        {product.image_path ? (
          <img
            src={product.image_path.startsWith('http') ? product.image_path : `${API_BASE}${product.image_path}`}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/1e293b/ffffff?text=' + encodeURIComponent(product.name); }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 5H4V19L13.292 9.706a1 1 0 011.414 0L20 15.01V5zM2 3.993A1 1 0 012.992 3h18.016c.548 0 .992.445.992.993v16.014a1 1 0 01-.992.993H2.992A.993.993 0 012 20.007V3.993zM8 11a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded-lg">نفد المخزون</span>
          </div>
        )}

        {isLowStock && (
          <div className="absolute top-2 left-2">
            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">مخزون منخفض</span>
          </div>
        )}

        {!isOutOfStock && (
          <button
            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
            className="absolute bottom-2 left-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700 shadow-lg"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-bold text-sm text-text-primary dark:text-white truncate">{product.name}</h3>
        <p className="text-xs text-text-muted dark:text-slate-400 mt-0.5">{product.category}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-primary font-bold text-sm">{product.selling_price.toFixed(2)} ج.م</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${stockColor}`}>
            {product.stock} {product.unit}
          </span>
        </div>
      </div>
    </div>
  );
}
