import Header from './components/Header';
import GameCarousel from './components/GameCarousel';

export default function Home() {
  return (
    <main className="min-h-screen bg-charcoal-800 flex flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <GameCarousel />
        
        <section className="mb-10">
          <h1 className="text-4xl font-bold text-grey-400 mb-6">Welcome to YapSports</h1>
          <p className="text-xl text-grey-600 max-w-3xl">
            Your one-stop destination for NBA statistics, player information, and game data.
            Use the search bar above to find your favorite players.
          </p>
        </section>
        
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Featured Content Cards */}
          <div className="bg-charcoal-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-grey-500 mb-3">Player Stats</h2>
              <p className="text-grey-700">
                Access detailed statistics for all NBA players, including points, assists, rebounds, and more.
              </p>
            </div>
          </div>
          
          <div className="bg-charcoal-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-grey-500 mb-3">Game Results</h2>
              <p className="text-grey-700">
                Stay updated with the latest game results, scores, and highlights from around the league.
              </p>
            </div>
          </div>
          
          <div className="bg-charcoal-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-grey-500 mb-3">Team Standings</h2>
              <p className="text-grey-700">
                View current standings for all NBA teams in both Eastern and Western conferences.
              </p>
            </div>
          </div>
        </section>
      </div>
      
      <footer className="bg-charcoal-900 py-4 border-t border-charcoal-600">
        <div className="container mx-auto px-4 text-center text-grey-800">
          <p>© 2024 YapSports. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
} 