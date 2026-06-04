import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  useGetStoreWishlist,
  useAddToStoreWishlist,
  useRemoveFromStoreWishlist,
  getGetStoreWishlistQueryKey,
} from "@workspace/api-client-react";
import { useCustomerAuth } from "./CustomerAuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type WishlistContextType = {
  wishlistIds: number[];
  addToWishlist: (productId: number) => void;
  removeFromWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { customer } = useCustomerAuth();
  const queryClient = useQueryClient();

  const [localWishlist, setLocalWishlist] = useState<number[]>(() => {
    const saved = localStorage.getItem("store_wishlist");
    return saved ? JSON.parse(saved) : [];
  });

  const { data: serverWishlist } = useGetStoreWishlist({
    query: {
      enabled: !!customer,
      queryKey: getGetStoreWishlistQueryKey(),
    },
  });

  const addMutation = useAddToStoreWishlist();
  const removeMutation = useRemoveFromStoreWishlist();

  const wishlistIds = customer ? (serverWishlist?.map((p) => p.id) ?? []) : localWishlist;

  // Sync local to server on login
  const hasSynced = useRef(false);
  useEffect(() => {
    if (customer && localWishlist.length > 0 && !hasSynced.current) {
      hasSynced.current = true;
      localWishlist.forEach((id) => {
        addMutation.mutate(
          { data: { productId: id } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetStoreWishlistQueryKey() });
            },
          }
        );
      });
      setLocalWishlist([]);
      localStorage.removeItem("store_wishlist");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const addToWishlist = (productId: number) => {
    if (customer) {
      // Optimistic update
      const current = queryClient.getQueryData<any>(getGetStoreWishlistQueryKey());
      if (current) {
        queryClient.setQueryData(getGetStoreWishlistQueryKey(), {
          wishlistItems: [...current.wishlistItems, productId],
        });
      }
      addMutation.mutate(
        { data: { productId } },
        {
          onSuccess: () => {
            toast.success("Added to wishlist");
            queryClient.invalidateQueries({ queryKey: getGetStoreWishlistQueryKey() });
          },
          onError: () => {
             // Revert
             queryClient.invalidateQueries({ queryKey: getGetStoreWishlistQueryKey() });
          }
        }
      );
    } else {
      setLocalWishlist((prev) => {
        const next = [...prev, productId];
        localStorage.setItem("store_wishlist", JSON.stringify(next));
        return next;
      });
      toast.success("Added to wishlist");
    }
  };

  const removeFromWishlist = (productId: number) => {
    if (customer) {
      // Optimistic update
      const current = queryClient.getQueryData<any>(getGetStoreWishlistQueryKey());
      if (current) {
        queryClient.setQueryData(getGetStoreWishlistQueryKey(), {
          wishlistItems: current.wishlistItems.filter((id: number) => id !== productId),
        });
      }
      removeMutation.mutate(
        { productId },
        {
          onSuccess: () => {
            toast.success("Removed from wishlist");
            queryClient.invalidateQueries({ queryKey: getGetStoreWishlistQueryKey() });
          },
          onError: () => {
             // Revert
             queryClient.invalidateQueries({ queryKey: getGetStoreWishlistQueryKey() });
          }
        }
      );
    } else {
      setLocalWishlist((prev) => {
        const next = prev.filter((id) => id !== productId);
        localStorage.setItem("store_wishlist", JSON.stringify(next));
        return next;
      });
      toast.success("Removed from wishlist");
    }
  };

  const isInWishlist = (productId: number) => wishlistIds.includes(productId);

  return (
    <WishlistContext.Provider
      value={{ wishlistIds, addToWishlist, removeFromWishlist, isInWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}
