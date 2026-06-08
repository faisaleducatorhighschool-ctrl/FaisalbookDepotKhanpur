import { useGetStoreFeatured, useListStoreCategories, useListStoreBrands, useGetStoreSettings } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ArrowRight, ShoppingBag, ShieldCheck, Truck, HeadphonesIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [_, setLocation] = useLocation();
  const { data: settings } = useGetStoreSettings();
  const { data: featured, isLoading: isLoadingFeatured } = useGetStoreFeatured();
  const { data: categories } = useListStoreCategories();
  const { data: brands } = useListStoreBrands();

  const currency = settings?.currency || "Rs.";

  return (
    <div className="flex flex-col gap-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32 relative flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
              Everyday Essentials, <span className="text-primary">Delivered Fast.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto md:mx-0">
              Shop thousands of products from top brands. Quality guaranteed with secure delivery across Pakistan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg" onClick={() => setLocation('/products')}>
                Shop Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg bg-background" onClick={() => setLocation('/products?sort=new')}>
                New Arrivals
              </Button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md md:max-w-full">
             <div className="aspect-square rounded-2xl bg-primary/10 overflow-hidden relative border shadow-2xl">
               {/* Fallback geometric design for hero */}
               <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                 <div className="bg-primary/20 m-2 rounded-tl-[4rem] rounded-br-2xl" />
                 <div className="bg-secondary/40 m-2 rounded-tr-2xl rounded-bl-[4rem]" />
                 <div className="bg-accent/60 m-2 rounded-tr-[4rem] rounded-bl-2xl" />
                 <div className="bg-primary/30 m-2 rounded-tl-2xl rounded-br-[4rem]" />
               </div>
               <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
                 <ShoppingBag className="h-32 w-32 text-primary drop-shadow-xl" />
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card rounded-2xl p-8 border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Fast Delivery</h3>
              <p className="text-sm text-muted-foreground">Nationwide shipping</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">100% secure checkout</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <HeadphonesIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">24/7 Support</h3>
              <p className="text-sm text-muted-foreground">Dedicated assistance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Shop by Category</h2>
          <Button variant="ghost" onClick={() => setLocation('/products')}>View All</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories?.slice(0, 6).map((category) => (
            <Link key={category.id} href={`/products?categoryId=${category.id}`} className="group flex flex-col items-center p-6 bg-muted/50 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300">
              <div className="h-16 w-16 mb-4 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <span className="font-bold text-lg text-primary">{category.name.charAt(0)}</span>
              </div>
              <span className="font-medium text-center text-sm">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Best Selling */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Best Selling</h2>
          <Button variant="ghost" onClick={() => setLocation('/products')}>View All</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {isLoadingFeatured ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-[250px] w-full rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : (
            featured?.bestSelling.slice(0, 5).map(product => (
              <ProductCard key={product.id} product={product} currency={currency} />
            ))
          )}
        </div>
      </section>

      {/* Sale Banner */}
      <section className="container mx-auto px-4">
        <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold">Big Savings on Essentials!</h2>
            <p className="text-primary-foreground/80 text-lg">Check out our discounted products section and save up to 50% off regular prices.</p>
          </div>
          <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold shrink-0" onClick={() => setLocation('/products?sort=discount')}>
            View Deals
          </Button>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">New Arrivals</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {featured?.newArrivals.slice(0, 5).map(product => (
            <ProductCard key={product.id} product={product} currency={currency} />
          ))}
        </div>
      </section>

      {/* Brands Strip */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">Trusted by Top Brands</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60">
            {brands?.slice(0, 8).map(brand => (
              <div key={brand.id} className="text-xl font-bold text-foreground grayscale hover:grayscale-0 transition-all cursor-default">
                {brand.name}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
