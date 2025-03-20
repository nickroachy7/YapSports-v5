import Header from '../components/Header';

export default function GamePage() {
  return (
    <main className="min-h-screen bg-charcoal-800 flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors shadow-lg">
          Get Card
        </button>
      </div>
    </main>
  );
} 