"use client"

export default function NavigationCard() {
  return (
    <div className="px-4 py-3 bg-background border-t border-white/10">
      <div className="rounded-2xl p-4 shadow-lg backdrop-blur-md bg-white/80 dark:bg-black/40 border border-white/20 dark:border-white/10">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Distance</p>
            <p className="text-2xl font-bold text-foreground">2.1 km</p>
            <p className="text-xs text-muted-foreground mt-1">to Lok Kalyan Marg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ETA</p>
            <p className="text-2xl font-bold text-[#39C596]">6 min</p>
            <p className="text-xs text-muted-foreground mt-1">at current speed</p>
          </div>
        </div>

        {/* Safe Route toggle */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Optimal Route</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-5 bg-[#39C596] rounded-full relative shadow-sm">
              <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full shadow-md" />
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
