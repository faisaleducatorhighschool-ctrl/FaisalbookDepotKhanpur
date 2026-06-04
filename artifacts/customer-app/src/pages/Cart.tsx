import { useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useCart } from "@/context/CartContext";

export default function Cart() {
  const [, navigate] = useLocation();
  const { items, removeItem, updateQuantity, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-80 px-8 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Your cart is empty</h2>
          <p className="text-sm text-gray-400 mb-6">Add some products to get started</p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
            onClick={() => navigate("/shop")}
          >
            Shop Now
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="bg-white px-4 py-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">Cart</h1>
        <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="bg-white rounded-xl p-3 flex gap-3 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Img
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                {item.name}
              </p>
              <p className="text-sm font-bold text-indigo-600 mt-1">
                Rs {(item.discountPrice ?? item.salePrice).toLocaleString()}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="text-gray-600 p-0.5"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, Math.min(item.quantity + 1, item.stock))
                    }
                    className="text-gray-600 p-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className="text-base font-bold text-gray-900">
            Rs {subtotal.toLocaleString()}
          </span>
        </div>
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-11"
          onClick={() => navigate("/checkout")}
        >
          Proceed to Checkout
        </Button>
      </div>
    </MobileLayout>
  );
}
