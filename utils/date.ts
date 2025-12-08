// date and time utility functions

/**
 * get time-based greeting
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/**
 * get current CST time
 */
export function getCSTTime(): Date {
  const now = new Date()
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }))
}

