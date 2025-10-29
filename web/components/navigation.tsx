"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { getProductLogo } from "@/components/logos"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

const products: { title: string; href: string; description: string; disabled?: boolean }[] = [
  {
    title: "Wallet Manager",
    href: "/",
    description: "Connect and manage your Solana wallets for Maximus",
  },
  {
    title: "Delegate",
    href: "/delegate",
    description: "Create a delegate wallet for autonomous transaction signing",
  },
  {
    title: "Token Approval",
    href: "/approve-token",
    description: "Allow your delegate to spend tokens from your main wallet",
  },
]

const Navigation = React.memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-[200]">
        <div className="max-w-5xl mx-auto border-r border-l border-b border-sand-1400 bg-bg1 backdrop-blur-md">
          
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-4 z-10">
              <Logo className="text-sand-100" width={50} height={50} />
            </Link>
            
            {/* Navigation Menu */}
            {/* <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                  <NavigationMenuContent className="w-[350px] gap-2 sm:w-[400px] sm:grid-cols-2 md:w-[500px] lg:w-[600px] p-4">
                    <ul className="grid grid-cols-2">
                      {products.map((product) => (
                        <ListItemWithIcon
                          key={product.title}
                          title={product.title}
                          href={product.href}
                          disabled={product.disabled}
                        >
                          {product.description}
                        </ListItemWithIcon>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="https://github.com/solana-labs">Docs</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu> */}
            
            {/* Mobile Menu Trigger */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-sand-1400 transition-colors"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-6 h-6 text-sand-100" />
            </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed top-[101px] left-0 right-0 bottom-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in-0 duration-150"
            onClick={closeMobileMenu}
          />
          
          {/* Mobile Menu replacing nav */}
          <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top-2 fade-in-0 duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="max-w-7xl mx-auto border-r border-l border-b border-border-low bg-bg1/80 backdrop-blur-md">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between h-16">
                  {/* Logo */}
                  <Link href="/" className="flex items-center gap-1">
                    <Logo className="text-sand-100" width={30} height={30} />
                    <span className="text-xl font-diatype-bold text-sand-100 mt-[-4px]">Maximus</span>
                  </Link>
                  
                  {/* Close Button in hamburger position */}
                  <button 
                    className="md:hidden p-2 rounded-lg hover:bg-sand-1400 transition-colors"
                    onClick={closeMobileMenu}
                    aria-label="Close mobile menu"
                  >
                    <X className="w-6 h-6 text-sand-100" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mobile Menu Content */}
            <div className="animate-in slide-in-from-top-2 fade-in-0 duration-150 delay-75 ease-[cubic-bezier(0.32,0.72,0,1)]">
              <div className="max-w-7xl mx-auto border-r border-l border-b border-border-low bg-bg1">
                <div className="p-6">

              {/* Products Section */}
              <div className="mb-6">
                <h3 className="font-diatype text-sm text-sand-100 mb-1">Features</h3>
                <div className="space-y-3">
                  {products.map((product, index) => {
                    const ProductLogo = getProductLogo(product.title);
                    
                    if (product.disabled) {
                      return (
                        <div
                          key={product.title}
                          className="group grid grid-cols-6 gap-4 p-1.5 rounded-xl opacity-60 cursor-not-allowed animate-in slide-in-from-left-2 fade-in-0"
                          style={{
                            animationDelay: `${100 + (index * 50)}ms`,
                            animationFillMode: 'both'
                          }}
                        >
                          <div className="col-span-1 w-10 h-10 bg-sand-1400/50 rounded-lg flex items-center justify-center border border-border-strong">
                            <ProductLogo width={25} height={25} />
                          </div>
                          <div className="col-span-5">
                            <div className="font-diatype-bold text-sm text-sand-800">{product.title}</div>
                            <p className="text-xs text-sand-800 leading-relaxed">{product.description}</p>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <Link
                        key={product.title}
                        href={product.href}
                        onClick={closeMobileMenu}
                        className="group grid grid-cols-6 gap-4 p-1.5 active:bg-sand-1300 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in slide-in-from-left-2 fade-in-0"
                        style={{
                          animationDelay: `${100 + (index * 50)}ms`,
                          animationFillMode: 'both'
                        }}
                      >
                        <div className="col-span-1 w-10 h-10 bg-sand-1400 rounded-lg flex items-center justify-center border border-border-strong group-active:shadow-md transition-all duration-300 ease-in-out">
                          <ProductLogo width={25} height={25} />
                        </div>
                        <div className="col-span-5">
                          <div className="font-diatype-bold text-sm text-sand-100">{product.title}</div>
                          <p className="text-xs text-sand-500 leading-relaxed">{product.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

                {/* Navigation Links */}
                <div className="space-y-2 border-t border-border-low pt-4">
                  <Link 
                    href="https://github.com/solana-labs" 
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 font-diatype-bold text-sand-100 hover:bg-sand-1400 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in slide-in-from-left-2 fade-in-0"
                    style={{
                      animationDelay: '300ms',
                      animationFillMode: 'both'
                    }}
                  >
                    Docs
                  </Link>
                </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
})



function ListItemWithIcon({
  className,
  title,
  children,
  href,
  disabled,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { 
  title: string;
  href: string;
  className?: string;
  disabled?: boolean;
}) {
  const ProductLogo = getProductLogo(title);
  
  if (disabled) {
    return (
      <li {...props}>
        <div 
          className={cn(
            "group grid grid-cols-6 justify-start select-none rounded-xl p-3 leading-none no-underline outline-none opacity-60 cursor-not-allowed",
            className
          )}
        >
          <div className="flex col-span-1 items-center justify-center w-8 h-8 bg-sand-1400/30 shadow-sm rounded-lg p-1 border border-border-medium">
            <ProductLogo width={20} height={20} />
          </div>
          <div className="space-y-1 col-span-5">
            <div className="text-sm font-medium leading-none font-diatype-bold text-sand-800">{title}</div>
            <p className="line-clamp-2 text-xs leading-snug text-sand-800">
              {children}
            </p>
          </div>
        </div>
      </li>
    );
  }
  
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link 
          href={href}
          className={cn(
            "group grid grid-cols-6 justify-start select-none rounded-xl p-3 leading-none no-underline outline-none transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-1 hover:ring-sand-1200 hover:bg-sand-1400/50 hover:text-accent-foreground focus:bg-sand-1400 focus:text-accent-foreground active:scale-[0.98]",
            className
          )}
        >
          <div className="flex col-span-1 items-center justify-center w-8 h-8 group-hover:bg-sand-1300 bg-sand-1400/50 shadow-sm group-hover:shadow-md rounded-lg p-1 border border-border-medium transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]">
            <ProductLogo width={20} height={20} />
          </div>
          <div className="space-y-1 col-span-5">
            <div className="text-sm font-medium leading-none font-diatype-bold">{title}</div>
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
              {children}
            </p>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}

Navigation.displayName = 'Navigation';

export { Navigation };

