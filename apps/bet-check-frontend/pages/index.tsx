import axios from 'axios'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Game {
  game_id: string
  sport: string
  team_a: string
  team_b: string
  scheduled_date: string
  result: string | null
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/games`)
      setGames(response.data)
      setError('')
    } catch (err) {
      console.error('Error fetching games:', err)
      setError('Failed to load games. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-pink-500">BetCheck</h1>
        <p className="text-gray-400">AI-Powered Sports Predictions</p>
      </header>

      <main>
        <h2 className="text-2xl font-semibold mb-6">Upcoming Games</h2>

        {loading && <p>Loading games...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && games.length === 0 && (
          <p className="text-gray-500">No upcoming games found.</p>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <div key={game.game_id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-pink-500 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-500">{game.sport}</span>
                <span className="text-xs text-gray-500">{game.scheduled_date}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{game.team_a}</h3>
              <p className="text-gray-500 text-sm mb-2">vs</p>
              <h3 className="text-xl font-bold mb-4">{game.team_b}</h3>
              
              <Link href={`/predict/${game.game_id}`} className="text-pink-500 hover:text-pink-400 font-semibold text-sm">
                View Prediction →
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
