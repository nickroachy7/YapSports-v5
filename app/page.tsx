import Header from './components/Header';
import GameCarousel from './components/GameCarousel';

export default function Home() {
  return (
    <main className="min-h-screen bg-charcoal-800 flex flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <GameCarousel />
      </div>
      
      <footer className="bg-charcoal-900 py-4 border-t border-charcoal-600">
        <div className="container mx-auto px-4 text-center text-grey-800">
          <p>© 2024 YapSports. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
} 