"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps, MouseEvent } from "react"

type HashLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string
}

/**
 * For links like `/#collection`: works from any route (navigates to home + hash).
 * When already on `/`, smooth-scrolls so repeated clicks still move to the section.
 */
export function HashLink({ href, onClick, ...props }: HashLinkProps) {
  const pathname = usePathname()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented) return
    if (!href.startsWith("/#")) return
    const id = href.slice(2)
    if (!id) return
    if (pathname === "/") {
      e.preventDefault()
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return <Link href={href} onClick={handleClick} {...props} />
}
