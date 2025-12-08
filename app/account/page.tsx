"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"

export default function AccountPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [profilePic, setProfilePic] = useState<string | null>(null)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notifSettings, setNotifSettings] = useState({
    push: true,
    email: true,
    sms: false,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Load user metadata into form
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "")
      setPhone(user.user_metadata?.phone || "")
      setProfilePic(user.user_metadata?.avatar_url || null)
    }
  }, [user])

  async function handleSaveProfile() {
    setSaving(true)
    setSaveStatus(null)

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        phone: phone,
        avatar_url: profilePic,
      },
    })

    if (error) {
      setSaveStatus("Error saving profile")
    } else {
      setSaveStatus("Profile saved!")
      setIsEditing(false)
    }
    setSaving(false)

    setTimeout(() => setSaveStatus(null), 2000)
  }

  async function handleProfilePicUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // validate file type
    if (!file.type.startsWith('image/')) {
      setSaveStatus("Please upload an image file")
      setTimeout(() => setSaveStatus(null), 2000)
      return
    }

    // validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveStatus("Image must be less than 5MB")
      setTimeout(() => setSaveStatus(null), 2000)
      return
    }

    setUploadingPic(true)
    setSaveStatus(null)

    try {
      // create filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (data?.publicUrl) {
        setProfilePic(data.publicUrl)
        
        // update user metadata immediately
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            avatar_url: data.publicUrl,
          },
        })

        if (updateError) {
          throw updateError
        }
      }
    } catch (error: any) {
      setSaveStatus(error.message || "Error uploading image")
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setUploadingPic(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  function copyReferralCode() {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
  const referralCode = user.id?.slice(0, 8).toUpperCase() || "PHOTKA10"

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-14 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="text-sm text-neutral-400 mt-1">Manage your profile & preferences</p>
        </motion.div>

        <div className="space-y-4">
          {/* profile card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
          >
            <div className="flex items-start gap-4 mb-5">
              {/* avatar */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/20 overflow-hidden">
                  {profilePic ? (
                    <img 
                      src={profilePic} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center cursor-pointer hover:bg-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicUpload}
                    className="hidden"
                    disabled={uploadingPic}
                  />
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </label>
                {uploadingPic && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold">{displayName}</p>
                <p className="text-sm text-neutral-400">{user.email}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Member since{" "}
                  {new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* photka pro upgrade banner */}
            <button 
              onClick={() => router.push("/pro")}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-5 group hover:border-blue-500/30 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Upgrade to Pro</p>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">NEW</span>
                </div>
                <p className="text-xs text-neutral-500 truncate">Priority matching, discounts & 10 free edits/RAW</p>
              </div>
              <svg className="w-4 h-4 text-neutral-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* edit profile section */}
            {isEditing ? (
              <div className="space-y-4 border-t border-white/[0.06] pt-5">
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-neutral-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-neutral-300 text-sm font-medium hover:bg-white/[0.03] transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-white/[0.06] pt-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-neutral-300">
                        {fullName || <span className="text-neutral-500 italic">No name set</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-neutral-300">
                        {phone || <span className="text-neutral-500 italic">No phone set</span>}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition px-4 py-2 bg-blue-500/10 rounded-xl"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {saveStatus && (
              <p className={`text-sm text-center mt-4 ${saveStatus.includes("Error") ? "text-red-400" : "text-emerald-400"}`}>
                {saveStatus}
              </p>
            )}
          </motion.div>

          {/* wallet & credits */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
          >
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Wallet</h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold">$0.00</p>
                <p className="text-xs text-neutral-500">Available credits</p>
              </div>
              <button className="px-4 py-2 bg-blue-500/10 text-blue-400 text-sm font-medium rounded-xl hover:bg-blue-500/20 transition">
                Add funds
              </button>
            </div>
            <button 
              onClick={() => router.push("/referrals")}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition group"
            >
              <p className="text-sm text-amber-200">Refer a friend and earn $10 credit</p>
              <svg className="w-4 h-4 text-amber-400/60 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>

          {/* payment methods */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Payment Methods</h3>
              <button className="text-xs text-blue-400">+ Add</button>
            </div>
            <div className="p-4 rounded-2xl border border-dashed border-white/10 text-center">
              <svg className="w-8 h-8 mx-auto text-neutral-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-sm text-neutral-500">No payment methods</p>
              <p className="text-xs text-neutral-600 mt-1">Add a card to book sessions</p>
            </div>
          </motion.div>

          {/* Referral Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl p-5"
          >
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Referrals</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 p-3 bg-black/30 rounded-xl border border-white/10">
                <p className="text-xs text-neutral-500 mb-1">Your code</p>
                <p className="text-lg font-mono font-bold text-blue-400">{referralCode}</p>
              </div>
              <button 
                onClick={copyReferralCode}
                className={`p-3 rounded-xl transition ${
                  copied 
                    ? "bg-emerald-500/20 border border-emerald-500/30" 
                    : "bg-white/10 hover:bg-white/20 border border-transparent"
                }`}
                title="Copy referral code"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-black/20 rounded-xl text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-neutral-500">Friends invited</p>
              </div>
              <div className="p-3 bg-black/20 rounded-xl text-center">
                <p className="text-2xl font-bold">$0</p>
                <p className="text-xs text-neutral-500">Credits earned</p>
              </div>
            </div>
          </motion.div>

          {/* saved addresses */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Saved Locations</h3>
              <button className="text-xs text-blue-400">+ Add</button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Home</p>
                  <p className="text-xs text-neutral-500">Add your home address</p>
                </div>
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Work</p>
                  <p className="text-xs text-neutral-500">Add your work address</p>
                </div>
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Notification Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
          >
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Notifications</h3>
            <div className="space-y-3">
              {[
                { key: "push", label: "Push notifications", desc: "Booking updates & reminders" },
                { key: "email", label: "Email", desc: "Receipts & confirmations" },
                { key: "sms", label: "SMS", desc: "Urgent updates only" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-neutral-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className={`w-12 h-7 rounded-full transition-colors relative ${
                      notifSettings[item.key as keyof typeof notifSettings] ? "bg-blue-500" : "bg-neutral-700"
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      notifSettings[item.key as keyof typeof notifSettings] ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Favorite Photographers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
          >
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Favorite Photographers</h3>
            <div className="p-4 rounded-2xl border border-dashed border-white/10 text-center">
              <svg className="w-8 h-8 mx-auto text-neutral-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="text-sm text-neutral-500">No favorites yet</p>
              <p className="text-xs text-neutral-600 mt-1">Save photographers you love</p>
            </div>
          </motion.div>

          {/* Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
          >
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Preferences</h3>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium">Default session type</p>
                <p className="text-xs text-neutral-500">Pre-select when booking</p>
              </div>
              <select className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="iphone">iPhone</option>
                <option value="raw_dslr">RAW DSLR</option>
                <option value="edited_dslr">Edited DSLR</option>
              </select>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl divide-y divide-white/[0.04]"
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm">Help & Support</span>
              </div>
              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <span className="text-sm">Rate your experience</span>
              </div>
              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl divide-y divide-white/[0.04]"
          >
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition">
              <span className="text-sm text-neutral-400">Terms of Service</span>
              <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition">
              <span className="text-sm text-neutral-400">Privacy Policy</span>
              <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>

          {/* Sign out button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            onClick={handleSignOut}
            className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 py-3.5 text-sm font-medium hover:bg-red-500/20 transition"
          >
            Sign out
          </motion.button>

          {/* App version */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-neutral-600 pb-4"
          >
            Photka v1.0.0
          </motion.p>
        </div>
      </div>
    </div>
  )
}
