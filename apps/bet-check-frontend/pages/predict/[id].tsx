import axios from 'axios'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Prediction {
  game_id: string
  predicted_outcome: string
  confidence: number
  reasons: string[]
  factor_contributions: Record<string, { team_a: number; team_b: number }>
}

export default function PredictionPage() {
  const router = useRouter()
  const { id } = router.query
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      fetchPrediction()
    }
  }, [id])

  const fetchPrediction = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/predict/${id}`)
      setPrediction(response.data)
    } catch (err) {
      console.error('Error fetching prediction:', err)
      setError('Failed to load prediction.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading prediction...</div>
  if (error) return <div className="min-h-screen bg-gray-900 text-white p-8">{error}</div>
  if (!prediction) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href="/" className="text-pink-500 hover:text-pink-400 mb-8 inline-block">← Back to Games</Link>
      
      <header className="mb-12">
        <h1 className="text-3xl font-bold mb-2">Game Prediction</h1>
        <p className="text-gray-400">Analysis for Game ID: {id}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="bg-gray-800 p-8 rounded-2xl border border-pink-500/30">
          <h2 className="text-xl text-gray-400 uppercase tracking-widest text-sm mb-4">Predicted Winner</h2>
          <div className="text-5xl font-black text-pink-500 mb-4">{prediction.predicted_outcome}</div>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">{prediction.confidence}% Confidence</div>
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500" style={{ width: `${prediction.confidence}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
          <h2 className="text-xl font-bold mb-6">Key Factors</h2>
          <ul className="space-y-4">
            {prediction.reasons.map((reason, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="text-pink-500 font-bold">✓</span>
                <span className="text-gray-300">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
