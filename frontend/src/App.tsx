// src/App.tsx
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/healthz`)
      return res.data
    },
  })

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>API unreachable</p>

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <h1>Budget App</h1>
      <p>Backend status: {data.status}</p>
    </main>
  )
}

export default App
