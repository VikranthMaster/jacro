"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check } from "lucide-react"

type Props = {
  orderId: string
  redirectSeconds?: number
}

export function OrderSuccessScreen({ orderId, redirectSeconds = 7 }: Props) {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(redirectSeconds)

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.push("/")
    }
  }, [secondsLeft, router])

  const shortId = orderId.length > 12 ? `${orderId.slice(0, 8)}…` : orderId

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-[#E5E5E5] rounded-sm p-8 md:p-12 text-center max-w-lg mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#111111] flex items-center justify-center"
      >
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <Check className="w-10 h-10 text-white stroke-[3]" />
        </motion.div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="font-serif text-2xl md:text-3xl text-[#111111] mb-3"
      >
        Your order has been successfully placed
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-[#6B6B6B] text-sm mb-2"
      >
        Order number
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-[#111111] font-mono text-sm md:text-base break-all mb-6 px-2"
        title={orderId}
      >
        {shortId}
        <span className="block text-xs text-[#6B6B6B] mt-1 font-sans">{orderId}</span>
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-[#6B6B6B]"
      >
        Redirecting to home in {Math.max(secondsLeft, 0)}s…
      </motion.p>
    </motion.div>
  )
}
