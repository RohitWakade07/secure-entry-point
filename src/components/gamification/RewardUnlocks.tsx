import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Star,
  Zap,
  Trophy,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Reward {
  id: string;
  name: string;
  description: string;
  icon: "award" | "star" | "zap" | "trophy";
  amount: number;
  unlockedAt?: string;
  isNew?: boolean;
}

interface RewardUnlocksProps {
  rewards: Reward[];
  totalXp: number;
  totalPoints: number;
  className?: string;
}

const iconMap = {
  award: Award,
  star: Star,
  zap: Zap,
  trophy: Trophy,
};

export const RewardUnlocks = ({
  rewards,
  totalXp,
  totalPoints,
  className,
}: RewardUnlocksProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const newRewards = rewards.filter((r) => r.isNew);
  const unlockedRewards = rewards.filter((r) => r.unlockedAt);

  return (
    <div className={cn("space-y-4", className)}>
      {/* New Rewards Announcement */}
      <AnimatePresence>
        {newRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {newRewards.map((reward) => {
                    const IconComponent = iconMap[reward.icon];
                    return (
                      <motion.div
                        key={reward.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <IconComponent className="w-6 h-6 text-green-600" />
                          </motion.div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              🎉 {reward.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {reward.description}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-600 whitespace-nowrap">
                          +{reward.amount}
                          {reward.icon === "zap" ? " XP" : " Pts"}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* XP and Points Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Total XP
                  </span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">
                  {totalXp.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Level {Math.floor(totalXp / 1000) + 1}
                </p>
              </div>

              <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Reward Points
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {totalPoints.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Tier {Math.floor(totalPoints / 250)}
                </p>
              </div>
            </div>

            {/* Unlocked Rewards List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  Recent Unlocks ({unlockedRewards.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {unlockedRewards.slice(0, 5).map((reward) => {
                      const IconComponent = iconMap[reward.icon];
                      return (
                        <div
                          key={reward.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-gray-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {reward.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {reward.unlockedAt
                                  ? new Date(reward.unlockedAt).toLocaleDateString()
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            +{reward.amount}
                          </Badge>
                        </div>
                      );
                    })}
                    {unlockedRewards.length > 5 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        +{unlockedRewards.length - 5} more rewards
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Next Reward Hint */}
            {unlockedRewards.length < rewards.length && (
              <div className="pt-2 border-t bg-blue-50 p-2 rounded">
                <div className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Keep improving! Complete more tests to unlock additional rewards and achievements.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
