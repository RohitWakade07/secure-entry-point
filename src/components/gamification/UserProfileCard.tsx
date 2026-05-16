import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Award,
  TrendingUp,
  Users,
  Percent,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UserProfileCardProps {
  userName: string;
  rank?: number;
  totalXp: number;
  rewardPoints: number;
  accuracy: number;
  testsCompleted: number;
  currentStreak: number;
  className?: string;
}

export const UserProfileCard = ({
  userName,
  rank,
  totalXp,
  rewardPoints,
  accuracy,
  testsCompleted,
  currentStreak,
  className,
}: UserProfileCardProps) => {
  // Calculate XP to next level (arbitrary: 1000 XP per level)
  const currentLevel = Math.floor(totalXp / 1000) + 1;
  const xpInCurrentLevel = totalXp % 1000;
  const xpToNextLevel = 1000;
  const xpProgress = (xpInCurrentLevel / xpToNextLevel) * 100;

  // Calculate reward tier (every 250 points)
  const rewardTier = Math.floor(rewardPoints / 250);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{userName}</CardTitle>
            <p className="text-xs text-gray-500">Gamification Profile</p>
          </div>
          {rank && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-right"
            >
              <div className="text-3xl font-bold text-blue-600">#{rank}</div>
              <p className="text-xs text-gray-500">Current Rank</p>
            </motion.div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Level & XP */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold">Level {currentLevel}</span>
            </div>
            <span className="text-xs text-gray-500">
              {xpInCurrentLevel.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
            </span>
          </div>
          <Progress value={xpProgress} className="h-2" />
          <p className="text-xs text-gray-500">Total XP: {totalXp.toLocaleString()}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Accuracy */}
          <div className="p-2 bg-green-50 rounded-lg">
            <div className="flex items-center gap-1 mb-1">
              <Percent className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-gray-700">Accuracy</span>
            </div>
            <div className="text-lg font-bold text-green-700">
              {accuracy.toFixed(1)}%
            </div>
          </div>

          {/* Tests Completed */}
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-1 mb-1">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-700">Tests</span>
            </div>
            <div className="text-lg font-bold text-blue-700">
              {testsCompleted}
            </div>
          </div>

          {/* Reward Points */}
          <div className="p-2 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-700">Rewards</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              {rewardPoints}
            </div>
          </div>

          {/* Streak */}
          <div className="p-2 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-700">Streak</span>
            </div>
            <div className="text-lg font-bold text-orange-700">
              {currentStreak}d
            </div>
          </div>
        </div>

        {/* Reward Tier */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Reward Tier
            </span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((tier) => (
                <Badge
                  key={tier}
                  variant={tier <= rewardTier ? "default" : "outline"}
                  className="text-xs"
                >
                  {tier + 1}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {rewardPoints >= 1250
              ? "🌟 Legendary tier unlocked! You are an elite achiever."
              : rewardPoints >= 1000
              ? "✨ Epic tier! Outstanding performance."
              : rewardPoints >= 750
              ? "🔥 Rare tier. Keep pushing!"
              : rewardPoints >= 250
              ? "⭐ Great progress on your gamification journey!"
              : "Start earning rewards by completing tests!"}
          </p>
        </div>

        {/* Milestone Progress */}
        {testsCompleted < 500 && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-semibold text-gray-700">
              Next Milestone
            </p>
            {testsCompleted < 50 && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>50 Tests Achievement</span>
                  <span>{testsCompleted}/50</span>
                </div>
                <Progress value={(testsCompleted / 50) * 100} className="h-1.5" />
              </div>
            )}
            {testsCompleted >= 50 && testsCompleted < 100 && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Century Achievement</span>
                  <span>{testsCompleted}/100</span>
                </div>
                <Progress value={(testsCompleted / 100) * 100} className="h-1.5" />
              </div>
            )}
            {testsCompleted >= 100 && testsCompleted < 500 && (
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Elite (500 Tests)</span>
                  <span>{testsCompleted}/500</span>
                </div>
                <Progress value={(testsCompleted / 500) * 100} className="h-1.5" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
