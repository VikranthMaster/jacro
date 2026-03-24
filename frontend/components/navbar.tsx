"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ShoppingBag, User, Menu, X, Heart, Package, Lock, LogOut } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { useWishlist } from "@/lib/wishlist"

interface NavbarProps {
  cartCount?: number
}

export function Navbar({ cartCount = 0 }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  
  const { isAuthenticated, user, logout } = useAuth()
  const wishlistCount = useWishlist((state) => state.items.length)
  const fetchWishlist = useWishlist((state) => state.fetchWishlist)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const userId = localStorage.getItem("user_id")
    if (userId) fetchWishlist(userId)
  }, [isAuthenticated, fetchWishlist])

  const handleLogout = () => {
    logout()
    setIsProfileOpen(false)
  }

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#F5F5DC]/95 backdrop-blur-md shadow-sm"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-[#111111]/70 hover:text-[#111111] transition-colors p-2"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </motion.button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="JACRO"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <NavLink href="#new">New Arrivals</NavLink>
              <NavLink href="#collection">Collection</NavLink>
              <NavLink href="#about">About</NavLink>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-3 sm:gap-5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:block text-[#111111]/60 hover:text-[#111111] transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </motion.button>

              {/* Wishlist */}
              <Link href="/wishlist">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative text-[#111111]/60 hover:text-[#111111] transition-colors"
                  aria-label="Wishlist"
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#C6A96B] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </motion.button>
              </Link>

              {/* Cart */}
              <Link href="/cart">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative text-[#111111]/60 hover:text-[#111111] transition-colors"
                  aria-label="Shopping cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#C6A96B] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </motion.button>
              </Link>

              {/* Auth Buttons / Profile Dropdown */}
              {isAuthenticated ? (
                <div className="relative" ref={profileRef}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="hidden md:block text-[#111111]/60 hover:text-[#111111] transition-colors"
                    aria-label="Account"
                  >
                    <User className="w-5 h-5" />
                  </motion.button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-56 bg-white rounded-lg shadow-lg border border-[#E5E5E5] overflow-hidden"
                      >
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-[#E5E5E5]">
                          <p className="text-sm font-medium text-[#111111]">{user?.name}</p>
                          <p className="text-xs text-[#6B6B6B]">{user?.email}</p>
                        </div>
                        
                        <div className="py-2">
                          <ProfileMenuItem href="/account" icon={<User className="w-4 h-4" />}>
                            My Account
                          </ProfileMenuItem>
                          <ProfileMenuItem href="/orders" icon={<Package className="w-4 h-4" />}>
                            Orders
                          </ProfileMenuItem>
                          <ProfileMenuItem href="/wishlist" icon={<Heart className="w-4 h-4" />}>
                            Wishlist
                          </ProfileMenuItem>
                          <ProfileMenuItem href="/change-password" icon={<Lock className="w-4 h-4" />}>
                            Change Password
                          </ProfileMenuItem>
                          <div className="border-t border-[#E5E5E5] my-2" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#111111]/70 hover:text-[#111111] hover:bg-[#F5F5DC]/50 transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link href="/login">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-sm text-[#111111]/70 hover:text-[#111111] transition-colors"
                    >
                      Login
                    </motion.button>
                  </Link>
                  <Link href="/signup">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-sm px-4 py-2 bg-[#111111] text-white rounded-sm hover:bg-[#2a2a2a] transition-colors"
                    >
                      Sign Up
                    </motion.button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "-100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-[#F5F5DC] pt-20 px-6 md:hidden"
          >
            <nav className="flex flex-col gap-6">
              <MobileNavLink href="#new" onClick={() => setIsMobileMenuOpen(false)}>
                New Arrivals
              </MobileNavLink>
              <MobileNavLink href="#collection" onClick={() => setIsMobileMenuOpen(false)}>
                Collection
              </MobileNavLink>
              <MobileNavLink href="#about" onClick={() => setIsMobileMenuOpen(false)}>
                About
              </MobileNavLink>
              
              <div className="border-t border-[#E5E5E5] pt-6 mt-2 flex flex-col gap-4">
                {isAuthenticated ? (
                  <>
                    <MobileNavLink href="/account" onClick={() => setIsMobileMenuOpen(false)}>
                      My Account
                    </MobileNavLink>
                    <MobileNavLink href="/orders" onClick={() => setIsMobileMenuOpen(false)}>
                      Orders
                    </MobileNavLink>
                    <MobileNavLink href="/wishlist" onClick={() => setIsMobileMenuOpen(false)}>
                      Wishlist ({wishlistCount})
                    </MobileNavLink>
                    <MobileNavLink href="/cart" onClick={() => setIsMobileMenuOpen(false)}>
                      Cart ({cartCount})
                    </MobileNavLink>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="text-lg font-serif text-[#111111]/80 hover:text-[#111111] tracking-[0.06em] transition-colors py-2 w-full text-left"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <MobileNavLink href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      Login
                    </MobileNavLink>
                    <MobileNavLink href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      Sign Up
                    </MobileNavLink>
                    <MobileNavLink href="/cart" onClick={() => setIsMobileMenuOpen(false)}>
                      Cart ({cartCount})
                    </MobileNavLink>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-[#111111]/60 hover:text-[#111111] tracking-[0.1em] uppercase transition-colors duration-300"
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ 
  href, 
  children, 
  onClick 
}: { 
  href: string
  children: React.ReactNode
  onClick: () => void 
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full text-left text-lg font-serif text-[#111111]/80 hover:text-[#111111] tracking-[0.06em] transition-colors py-2"
    >
      {children}
    </Link>
  )
}

function ProfileMenuItem({ 
  href, 
  icon, 
  children 
}: { 
  href: string
  icon: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#111111]/70 hover:text-[#111111] hover:bg-[#F5F5DC]/50 transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}
