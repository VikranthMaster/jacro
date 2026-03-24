"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { HashLink } from "@/components/hash-link"
import { Instagram, Twitter, Facebook } from "lucide-react"

const footerLinks = {
  shop: [
    { name: "New Arrivals", href: "/#new" },
    { name: "Best Sellers", href: "/#collection" },
    { name: "Sale", href: "/#collection" },
    { name: "All Products", href: "/#collection" },
  ],
  help: [
    { name: "FAQ", href: "/faq" },
    { name: "Shipping", href: "/help#shipping" },
    { name: "Returns", href: "/help#returns" },
    { name: "Contact Us", href: "/contact" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-[#EFE8D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="relative w-14 h-14 overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="JACRO"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-[#6B6B6B] text-sm leading-relaxed max-w-sm mb-6">
              Redefining everyday fashion with timeless minimalism. Crafted for those who appreciate the art of understated elegance.
            </p>
            
            {/* Social links */}
            <div className="flex gap-3">
              <SocialLink href="#" icon={<Instagram className="w-4 h-4" />} label="Instagram" />
              <SocialLink href="#" icon={<Twitter className="w-4 h-4" />} label="Twitter" />
              <SocialLink href="#" icon={<Facebook className="w-4 h-4" />} label="Facebook" />
            </div>
          </div>

          {/* Links */}
          <FooterLinkGroup title="Shop" links={footerLinks.shop} />
          <FooterLinkGroup title="Help" links={footerLinks.help} />
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-[#E5E5E5] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#6B6B6B] text-xs tracking-wide">
            2026 JACRO. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-[#6B6B6B]">
            <Link href="#" className="hover:text-[#111111] transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-[#111111] transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-[#111111] transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterLinkGroup({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.name}>
            {link.href.startsWith("/#") ? (
              <HashLink
                href={link.href}
                className="text-[#6B6B6B] text-sm hover:text-[#111111] transition-colors"
              >
                {link.name}
              </HashLink>
            ) : (
              <Link
                href={link.href}
                className="text-[#6B6B6B] text-sm hover:text-[#111111] transition-colors"
              >
                {link.name}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <motion.a
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      href={href}
      className="w-9 h-9 border border-[#E5E5E5] bg-white flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] hover:border-[#111111]/30 transition-all rounded-sm"
      aria-label={label}
    >
      {icon}
    </motion.a>
  )
}
