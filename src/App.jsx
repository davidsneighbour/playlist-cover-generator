import CoverGenerator from './components/CoverGenerator'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Playlist Cover Generator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create and export playlist cover art</p>
      </header>
      <main>
        <CoverGenerator />
      </main>
    </div>
  )
}
