import { GameSection } from "../base/game-section"; 
import { LinksSection } from "../base/links-section";
import { StatusBar } from "../base/status-bar";

 
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
       
        <StatusBar />
        <GameSection />
        <LinksSection />
      </div>
    </div>
  )
}