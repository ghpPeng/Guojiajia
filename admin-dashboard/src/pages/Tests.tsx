import { useState } from 'react'
import { api } from '../services/api'

export default function Tests() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState('')

  const runTest = async (type: string) => {
    setRunning(true)
    setResult('')
    try {
      const res = await api.post(`/api/tests/${type}`, {})
      setResult(JSON.stringify(res, null, 2))
    } catch (err) {
      setResult(`Error: ${err}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tests</h2>
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => runTest('unit')}
          disabled={running}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Run Unit Tests
        </button>
        <button
          onClick={() => runTest('integration')}
          disabled={running}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Run Integration Tests
        </button>
        <button
          onClick={() => runTest('e2e')}
          disabled={running}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Run E2E Tests
        </button>
      </div>
      {result && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="font-semibold mb-4">Test Results</h3>
          <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">{result}</pre>
        </div>
      )}
    </div>
  )
}
