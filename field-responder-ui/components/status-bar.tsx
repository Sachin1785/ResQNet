"use client"

type StatusType = "en-route" | "arrived" | "complete"

interface StatusBarProps {
  status: StatusType
  onStatusChange: (status: StatusType) => void
}

export default function StatusBar({ status, onStatusChange }: StatusBarProps) {
  const statuses: { value: StatusType; label: string; color: string }[] = [
    { value: "en-route", label: "En Route", color: "primary" },
    { value: "arrived", label: "Arrived", color: "warning" },
    { value: "complete", label: "Complete", color: "success" },
  ]

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 py-3 z-40">
      <div className="glass-strong rounded-2xl p-2 shadow-apple-lg border border-border/50">
        <div className="flex gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              className={`
                flex-1 py-3 px-3 rounded-xl font-semibold text-sm transition-apple ios-press
                ${status === s.value
                  ? s.color === "primary"
                    ? "bg-primary text-primary-foreground shadow-apple scale-105"
                    : s.color === "warning"
                      ? "bg-warning text-warning-foreground shadow-apple scale-105"
                      : "bg-success text-success-foreground shadow-apple scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }
              `}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

