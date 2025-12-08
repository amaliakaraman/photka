"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"

interface LoadingScreenProps {
  onComplete: () => void
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [step, setStep] = useState<"white" | "blue" | "lightning" | "expand">("white")
  const [blueProgress, setBlueProgress] = useState(0)
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    setTimeout(() => {
      setStep("blue")
    }, 200)

    setTimeout(() => {
      setStep("lightning")
    }, 1200)

    setTimeout(() => {
      setStep("expand")
    }, 1800)

    setTimeout(() => {
      onComplete()
    }, 2300)

    return () => {
      mounted.current = false
    }
  }, [onComplete])

  // animate blue progress - only during "blue" step
  useEffect(() => {
    if (step === "blue") {
      const startTime = Date.now()
      const duration = 1000
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        // use smooth easeOut for fluid animation
        const t = Math.min(elapsed / duration, 1)
        const progress = 1 - Math.pow(1 - t, 2) // quadratic easeOut - smoother
        setBlueProgress(progress)
        
        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          setBlueProgress(1)
        }
      }
      
      animate()
    } else if (step === "lightning" || step === "expand") {
      // keep blue at full width during lightning and expand
      setBlueProgress(1)
    }
  }, [step])

  const lightningOpacity = step === "lightning" || step === "expand" ? 1 : 0
  const expandScale = step === "expand" ? 20 : 1
  const expandOpacity = step === "expand" ? 0 : 1

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <motion.div
        animate={{
          scale: expandScale,
          opacity: expandOpacity,
        }}
        transition={{
          duration: 0.5,
          ease: "easeIn",
        }}
        className="relative w-64 h-64"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 375 375" 
          className="w-full h-full"
          fill="none"
        >
          <defs>
            <clipPath id="d164555c26">
              <path d="M 4 0.257812 L 251 0.257812 L 251 126.800781 L 4 126.800781 Z" />
            </clipPath>
            <clipPath id="8fdea41023">
              <path d="M 5.03125 95.121094 C 19.453125 39.277344 69.824219 0.257812 127.5 0.257812 C 185.175781 0.257812 235.546875 39.277344 249.96875 95.121094 C 253.460938 108.648438 245.324219 122.445312 231.796875 125.9375 C 218.269531 129.429688 204.472656 121.296875 200.980469 107.769531 C 192.328125 74.261719 162.105469 50.851562 127.5 50.851562 C 92.894531 50.851562 62.671875 74.261719 54.019531 107.769531 C 50.527344 121.296875 36.730469 129.429688 23.203125 125.9375 C 9.675781 122.445312 1.539062 108.648438 5.03125 95.121094 Z" />
            </clipPath>
            <clipPath id="7a34ace178">
              <path d="M 0 0.257812 L 247 0.257812 L 247 126.800781 L 0 126.800781 Z" />
            </clipPath>
            <clipPath id="b28fc42bed">
              <path d="M 1.03125 95.121094 C 15.453125 39.277344 65.824219 0.257812 123.5 0.257812 C 181.175781 0.257812 231.546875 39.277344 245.96875 95.121094 C 249.460938 108.648438 241.324219 122.445312 227.796875 125.9375 C 214.269531 129.429688 200.472656 121.296875 196.980469 107.769531 C 188.328125 74.261719 158.105469 50.851562 123.5 50.851562 C 88.894531 50.851562 58.671875 74.261719 50.019531 107.769531 C 46.527344 121.296875 32.730469 129.429688 19.203125 125.9375 C 5.675781 122.445312 -2.460938 108.648438 1.03125 95.121094 Z" />
            </clipPath>
            <clipPath id="507afb67a8">
              <rect x="0" width="247" y="0" height="127"/>
            </clipPath>
            <clipPath id="81d1f31b87">
              <path d="M 4 0.078125 L 181 0.078125 L 181 126.800781 L 4 126.800781 Z" />
            </clipPath>
            <clipPath id="b7b8d91f09">
              <path d="M 5.03125 95.121094 C 13.578125 62.03125 35.148438 33.804688 64.832031 16.875 C 94.519531 -0.0585938 129.792969 -4.257812 162.625 5.234375 C 176.046875 9.113281 183.78125 23.136719 179.902344 36.558594 C 176.019531 49.980469 161.996094 57.714844 148.574219 53.835938 C 128.875 48.140625 107.710938 50.660156 89.898438 60.820312 C 72.089844 70.980469 59.144531 87.914062 54.019531 107.769531 C 50.527344 121.296875 36.730469 129.429688 23.203125 125.9375 C 9.675781 122.445312 1.539062 108.648438 5.03125 95.121094 Z" />
            </clipPath>
            <clipPath id="23574e428f">
              <path d="M 0 0.078125 L 177 0.078125 L 177 126.800781 L 0 126.800781 Z" />
            </clipPath>
            <clipPath id="feafd729b7">
              <path d="M 1.03125 95.121094 C 9.578125 62.03125 31.148438 33.804688 60.832031 16.875 C 90.519531 -0.0585938 125.792969 -4.257812 158.625 5.234375 C 172.046875 9.113281 179.78125 23.136719 175.902344 36.558594 C 172.019531 49.980469 157.996094 57.714844 144.574219 53.835938 C 124.875 48.140625 103.710938 50.660156 85.898438 60.820312 C 68.089844 70.980469 55.144531 87.914062 50.019531 107.769531 C 46.527344 121.296875 32.730469 129.429688 19.203125 125.9375 C 5.675781 122.445312 -2.460938 108.648438 1.03125 95.121094 Z" />
            </clipPath>
            <clipPath id="1a6546f02e">
              <rect x="0" width="177" y="0" height="127"/>
            </clipPath>
            <clipPath id="bcd8deed94">
              <rect x="0" width="255" y="0" height="127"/>
            </clipPath>
            <clipPath id="dc8ae06487">
              <path d="M 100.109375 124.257812 L 187.859375 124.257812 L 187.859375 251 L 100.109375 251 Z" />
            </clipPath>
            <mask id="blue-reveal-mask">
              <rect x="0" y="0" width={4 + 177 * blueProgress} height="127" fill="white" />
            </mask>
          </defs>
          
          {/* white arch - static */}
          <g transform="matrix(1, 0, 0, 1, 60, 124)">
            <g clipPath="url(#bcd8deed94)">
              <g clipPath="url(#d164555c26)">
                <g clipPath="url(#8fdea41023)">
                  <g transform="matrix(1, 0, 0, 1, 4, 0)">
                    <g clipPath="url(#507afb67a8)">
                      <g clipPath="url(#7a34ace178)">
                        <g clipPath="url(#b28fc42bed)">
                          <path 
                            fill="#ffffff" 
                            d="M -2.984375 0.257812 L 249.984375 0.257812 L 249.984375 126.742188 L -2.984375 126.742188 Z" 
                            fillOpacity="1" 
                            fillRule="nonzero"
                          />
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
            
            {/* blue arch - animates from left to right following arch path */}
            <g clipPath="url(#81d1f31b87)" style={{ opacity: step !== "white" ? 1 : 0 }}>
              <g mask="url(#blue-reveal-mask)">
                <g clipPath="url(#b7b8d91f09)">
                  <g transform="matrix(1, 0, 0, 1, 4, 0)">
                    <g clipPath="url(#1a6546f02e)">
                      <g clipPath="url(#23574e428f)">
                        <g clipPath="url(#feafd729b7)">
                          <path 
                            fill="#0075ff" 
                            d="M -2.984375 0.257812 L 249.984375 0.257812 L 249.984375 126.742188 L -2.984375 126.742188 Z" 
                            fillOpacity="1" 
                            fillRule="nonzero"
                          />
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
          
          {/* lightning bolt - slices in from top */}
          <motion.g 
            clipPath="url(#dc8ae06487)"
            initial={{ opacity: 0, y: -50 }}
            animate={{ 
              opacity: lightningOpacity,
              y: lightningOpacity ? 0 : -50,
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <path 
              fill="#ffffff" 
              d="M 165.335938 124.269531 C 164.6875 124.363281 164.121094 124.902344 164.003906 125.042969 C 163.945312 125.113281 163.816406 125.183594 163.78125 125.265625 L 100.988281 193.9375 C 100.703125 194.226562 100.546875 194.609375 100.546875 195.046875 C 100.546875 195.921875 101.222656 196.601562 102.097656 196.601562 L 134.050781 196.601562 L 120.738281 248.519531 L 120.738281 248.855469 C 120.714844 248.953125 120.628906 249.078125 120.628906 249.1875 C 120.628906 250.0625 121.304688 250.742188 122.179688 250.742188 C 122.667969 250.742188 123.109375 250.535156 123.402344 250.1875 L 186.746094 177.960938 C 187.03125 177.675781 187.1875 177.289062 187.1875 176.851562 C 187.1875 175.980469 186.511719 175.300781 185.636719 175.300781 L 151.355469 175.300781 L 166.664062 126.597656 C 166.769531 126.386719 166.777344 126.183594 166.777344 125.933594 C 166.777344 125.058594 166.730469 124.675781 166 124.378906 C 165.78125 124.289062 165.550781 124.234375 165.335938 124.269531 Z" 
              fillOpacity="1" 
              fillRule="nonzero"
            />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  )
}
