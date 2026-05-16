import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakIndicatorProps {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  className?: string;
}

export const StreakIndicator = ({
  currentStreak,
  longestStreak,
  lastActivityDate,
  className,
}: StreakIndicatorProps) => {
  const lastActivity = lastActivityDate
    ? new Date(lastActivityDate)
    : new Date(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastActivity.setHours(0, 0, 0, 0);

  const timeDiff = today.getTime() - lastActivity.getTime();
  const daysSinceLastActivity = timeDiff / (1000 * 60 * 60 * 24);
  const isStreakActive = daysSinceLastActivity <= 1;

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "text-orange-600";
    if (streak >= 14) return "text-orange-500";
    if (streak >= 7) return "text-orange-400";
    if (streak >= 3) return "text-yellow-500";
    return "text-gray-400";
  };

  const getProgressPercent = (current: number, longest: number) => {
    if (longest === 0) return 0;
    return (current / longest) * 100;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Current Streak */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame
                  className={cn(
                    "w-5 h-5",
                    isStreakActive ? getStreakColor(currentStreak) : "text-gray-300"
                  )}
                />
                <span className="text-sm font-semibold text-gray-700">
                  Current Streak
                </span>
              </div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  getStreakColor(currentStreak)
                )}
              >
                {currentStreak}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {isStreakActive
                ? "Keep it going! Complete a test today to maintain your streak."
                : "Your streak ended. Start a new one today!"}
            </div>
          </div>

          {/* Longest Streak */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Best Streak
                </span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {longestStreak}
              </span>
            </div>
            {currentStreak > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Current Progress</span>
                  <span>
                    {Math.round(getProgressPercent(currentStreak, longestStreak))}
                    %
                  </span>
                </div>
                <Progress
                  value={getProgressPercent(currentStreak, longestStreak)}
                  className="h-1.5"
                />
              </div>
            )}
          </div>

          {/* Milestone Messages */}
          <div className="pt-2 border-t space-y-2">
            {currentStreak === 7 && (
              <p className="text-xs text-blue-600 font-medium">
                🎉 You've reached 7 days! Week Warrior badge earned!
              </p>
            )}
            {currentStreak === 14 && (
              <p className="text-xs text-blue-600 font-medium">
                🎉 You've reached 14 days! Two Week Champion unlocked!
              </p>
            )}
            {currentStreak === 30 && (
              <p className="text-xs text-blue-600 font-medium">
                🎉 You've reached 30 days! Month Master achievement unlocked!
              </p>
            )}
            {currentStreak > longestStreak && (
              <p className="text-xs text-green-600 font-medium">
                📈 New personal best! You're on fire!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
