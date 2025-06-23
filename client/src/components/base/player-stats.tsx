import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { useAccount } from "@starknet-react/core"
import useAppStore from "../../zustand/store"
import { Coins, Zap, Heart, Loader2, AlertTriangle, Footprints } from "lucide-react" 

export function PlayerStats() {
  const { status } = useAccount();
  const player = useAppStore(state => state.player);
  const health = useAppStore(state => state.health);
  const inventory = useAppStore(state => state.inventory);
  const isLoading = useAppStore(state => state.isLoading);
     
  const stepCount = Number(player?.steps) || 0; 
  const isConnected = status === "connected";
  const healthValue = Number(health?.current) || 0
  const healthMax = Number(health?.max) || 100;  


  // Use real player data or default values
  const stats = [
    {
      label: "Steps",
      value: stepCount,
      color: "text-blue-400",
      icon: Footprints
    },
    {
      label: "Health",
      value:  healthValue,
      color: getHealthColor(healthValue),
      icon: Heart,
      max: healthMax
    },
    {
      label: "Cosmetics",
      value: inventory?.cosmetics?.length || 0,
      color: "text-yellow-400",
      icon: Coins
    },
  ];

  // Function to get health color based on value
  function getHealthColor(health: number): string {
    if (health >= 80) return "text-green-400";
    if (health >= 50) return "text-yellow-400";
    if (health >= 20) return "text-orange-400";
    return "text-red-400";
  }

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-xl font-bold">Player Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading player data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-xl font-bold">Player Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main stats */}
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${stat.color}`}>
                  {stat.value}
                  {stat.max && `/${stat.max}`}
                </span>
                {/* Low health indicator */}
                {stat.label === "Health" && stat.value <= 20 && (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>
          );
        })}

        {/* Health bar */}
        {health && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Health Status</span>
              <span className={`font-bold text-sm ${getHealthColor(healthValue)}`}>
                {healthValue >= 80 ? "Excellent" :
                  healthValue >= 50 ? "Good" :
                    healthValue >= 20 ? "Poor" : "Critical"}
              </span>
            </div>
            <Progress
              value={healthValue}
              className={`h-2 ${healthValue >= 50 ? "bg-slate-700" : "bg-red-900/30"
                }`}
            />
          </div>
        )}

        {/* Connection states */}
        {!isConnected && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <Coins className="w-4 h-4" />
              <span>Connect controller to load real player stats</span>
            </div>
          </div>
        )}

        {isConnected && !player && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Zap className="w-4 h-4" />
              <span>Creating your player automatically...</span>
            </div>
          </div>
        )}

        {isConnected && player && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Heart className="w-4 h-4" />
              <span>Player ready! Use actions to train and progress.</span>
            </div>
          </div>
        )}

        {/* Low health warning */}
        {health && healthValue <= 20 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>⚠️ Low health! Rest to recover before mining.</span>
            </div>
          </div>
        )}
       
      </CardContent>
    </Card>
  )
}
