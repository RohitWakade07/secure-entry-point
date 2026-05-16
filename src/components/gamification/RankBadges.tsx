import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Crown, Star, Zap, Target, TrendingUp, Flame } from "lucide-react";

interface RankBadgesProps {
  rank: number;
  accuracy: number;
  speed: number;
  consistency: number;
  testsCompleted: number;
  streak: number;
}

export const RankBadges = ({
  rank,
  accuracy,
  speed,
  consistency,
  testsCompleted,
  streak,
}: RankBadgesProps) => {
  const badges = [];

  // Rank-based badges
  if (rank <= 10) {
    badges.push({
      id: "top-10",
      name: "Top 10",
      description: "Ranked in top 10",
      icon: Crown,
      color: "bg-yellow-500",
    });
  } else if (rank <= 100) {
    badges.push({
      id: "top-100",
      name: "Elite",
      description: "Ranked in top 100",
      icon: Star,
      color: "bg-purple-500",
    });
  } else if (rank <= 500) {
    badges.push({
      id: "top-500",
      name: "Rising",
      description: "Ranked in top 500",
      icon: TrendingUp,
      color: "bg-blue-500",
    });
  }

  // Accuracy badge
  if (accuracy >= 90) {
    badges.push({
      id: "accuracy-master",
      name: "Accuracy Master",
      description: `${accuracy.toFixed(1)}% accuracy`,
      icon: Target,
      color: "bg-green-500",
    });
  } else if (accuracy >= 80) {
    badges.push({
      id: "accuracy-pro",
      name: "Accuracy Pro",
      description: `${accuracy.toFixed(1)}% accuracy`,
      icon: Target,
      color: "bg-green-400",
    });
  }

  // Speed badge
  if (speed < 120) {
    // Less than 2 minutes per question
    badges.push({
      id: "speed-demon",
      name: "Speed Demon",
      description: "< 2 min per question",
      icon: Zap,
      color: "bg-red-500",
    });
  }

  // Consistency badge
  if (consistency >= 80) {
    badges.push({
      id: "consistency-king",
      name: "Consistency King",
      description: "Stable performance",
      icon: TrendingUp,
      color: "bg-indigo-500",
    });
  }

  // Streak badge
  if (streak >= 30) {
    badges.push({
      id: "month-master",
      name: "Month Master",
      description: "30+ day streak",
      icon: Flame,
      color: "bg-orange-500",
    });
  } else if (streak >= 14) {
    badges.push({
      id: "two-week",
      name: "Two Week",
      description: "14+ day streak",
      icon: Flame,
      color: "bg-orange-400",
    });
  } else if (streak >= 7) {
    badges.push({
      id: "week-warrior",
      name: "Week Warrior",
      description: "7+ day streak",
      icon: Flame,
      color: "bg-orange-300",
    });
  }

  // Milestone badges
  if (testsCompleted >= 500) {
    badges.push({
      id: "milestone-500",
      name: "500 Tests",
      description: "Completed 500 tests",
      icon: Star,
      color: "bg-pink-500",
    });
  } else if (testsCompleted >= 100) {
    badges.push({
      id: "milestone-100",
      name: "Century",
      description: "Completed 100 tests",
      icon: Star,
      color: "bg-pink-400",
    });
  } else if (testsCompleted >= 50) {
    badges.push({
      id: "milestone-50",
      name: "50 Tests",
      description: "Completed 50 tests",
      icon: Star,
      color: "bg-pink-300",
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const IconComponent = badge.icon;
        return (
          <Tooltip key={badge.id}>
            <TooltipTrigger>
              <Badge className={`${badge.color} text-white gap-1 cursor-help`}>
                <IconComponent className="w-3 h-3" />
                {badge.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{badge.description}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
